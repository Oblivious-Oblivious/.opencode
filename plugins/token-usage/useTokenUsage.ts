import type {TuiPluginApi} from "@opencode-ai/plugin/tui";
import type {AssistantMessage} from "@opencode-ai/sdk/v2";
import {get_cursor_usage, month_start_ms, type DateRange} from "./cursor-usage";
import {model_rates} from "./model-rates";
import {
  default_opencode_db_path,
  tally_opencode_sqlite,
  type SessionsDbTotal,
} from "./opencode-db-totals";

function normalize_model_key({model_id}: {model_id: string}) {
  const raw = model_id.trim().toLowerCase();
  if (model_rates[raw]) {
    return raw;
  }
  const i = raw.lastIndexOf("/");
  if (i !== -1) {
    const suffix = raw.slice(i + 1);
    if (model_rates[suffix]) {
      return suffix;
    }
  }
  return undefined;
}

export type SessionSnapshot = {
  total_tokens: string;
  cached_total: string;
  non_cached_total: string;
  cache_read: string;
  cache_write: string;
  non_cached_read: string;
  non_cached_write: string;
  cost_reported: string;
  real_cost: string;
};

function real_cost({message}: {message: AssistantMessage}) {
  const t = message.tokens;
  const key = normalize_model_key({model_id: message.modelID});
  const tier = key ? model_rates[key] : undefined;
  if (!tier) {
    return 0;
  }
  const r = t.input + t.cache.read > 256_000 ? tier[">256"] : tier["<256"];
  return (
    (t.input * r.input +
      (t.output + t.reasoning) * r.output +
      t.cache.read * r.cache_read +
      t.cache.write * r.cache_write) /
    1e6
  );
}

const inflight = new Map<string, Promise<SessionsDbTotal | undefined>>();
const last = new Map<string, SessionsDbTotal>();

async function fetch_sessions_total({
  api,
  is_cancelled,
  since,
  exclude_session_id,
}: {
  api: TuiPluginApi;
  is_cancelled: () => boolean;
  since?: number;
  exclude_session_id?: string;
}): Promise<SessionsDbTotal | undefined> {
  if (is_cancelled()) {
    return undefined;
  }
  const key = `${api.state.session.count()}${since ? "::month" : ""}${exclude_session_id ? `::excl:${exclude_session_id}` : ""}`;
  const prev = last.get(key);
  if (prev) {
    return is_cancelled() ? undefined : prev;
  }
  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      if (is_cancelled()) {
        return undefined;
      }
      const tally = tally_opencode_sqlite({
        db_path: default_opencode_db_path(),
        since,
        exclude_session_id,
        real_cost: m => real_cost({message: m}),
      });
      if (is_cancelled()) {
        return undefined;
      }
      return tally;
    })();
    inflight.set(key, p);
    p.finally(() => inflight.delete(key));
    p.then(r => {
      if (r) {
        last.set(key, r);
      }
    });
  }
  return p.then(r => (is_cancelled() ? undefined : r));
}

export function useTokenUsage({api}: {api: TuiPluginApi}) {
  return {
    session_measurements: ({
      session_id,
    }: {
      session_id: string;
    }): SessionSnapshot => {
      let total = 0,
        cr = 0,
        cw = 0,
        ncr = 0,
        ncw = 0,
        reported = 0,
        rc = 0;
      for (const m of api.state.session.messages(session_id)) {
        if (m.role !== "assistant") {
          continue;
        }
        const t = m.tokens;
        cr += t.cache.read;
        cw += t.cache.write;
        ncr += t.input;
        ncw += t.output + t.reasoning;
        total +=
          t.input + t.output + t.reasoning + t.cache.read + t.cache.write;
        reported += m.cost;
        rc += real_cost({message: m});
      }
      const fmt = (n: number) => n.toLocaleString();
      return {
        total_tokens: fmt(total),
        cached_total: fmt(cr + cw),
        non_cached_total: fmt(ncr + ncw),
        cache_read: fmt(cr),
        cache_write: fmt(cw),
        non_cached_read: fmt(ncr),
        non_cached_write: fmt(ncw),
        cost_reported: reported === 0 ? "(SUB)" : `$${reported.toFixed(5)}`,
        real_cost: rc === 0 ? "(SUB)" : `$${rc.toFixed(5)}`,
      };
    },

    live_session_totals: ({
      session_id,
      since,
    }: {
      session_id: string;
      since?: number;
    }) => {
      let tokens = 0,
        cost = 0;
      for (const m of api.state.session.messages(session_id)) {
        if (m.role !== "assistant") {
          continue;
        }
        if (since && m.time.created < since) {
          continue;
        }
        const tk = m.tokens;
        tokens +=
          tk.input + tk.output + tk.reasoning + tk.cache.read + tk.cache.write;
        cost += real_cost({message: m});
      }
      return {tokens, cost};
    },

    sessions_total: (p: {
      is_cancelled: () => boolean;
      exclude_session_id?: string;
    }) => fetch_sessions_total({api, ...p}),

    sessions_total_month: (p: {
      is_cancelled: () => boolean;
      exclude_session_id?: string;
    }) => fetch_sessions_total({api, ...p, since: month_start_ms()}),

    cursor_usage: (range?: DateRange) => get_cursor_usage(range),
  };
}
