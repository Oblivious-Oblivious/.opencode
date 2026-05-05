import type {TuiPluginApi} from "@opencode-ai/plugin/tui";
import type {AssistantMessage} from "@opencode-ai/sdk/v2";
import {Database} from "bun:sqlite";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {cursor_rate_key, model_rates, opencode_rate_key} from "./model-rates";

export type DateRange = "current-month" | "all-time";
type Total = {tokens: number; cost: number};
type DbTotal = Total & {total_sessions: number};
type Buckets = {
  read: number;
  read_cache: number;
  write: number;
  write_cache: number;
};

export type SessionSnapshot = {
  total_tokens: string;
  cache_read: string;
  cache_write: string;
  non_cached_read: string;
  non_cached_write: string;
  cost_reported: string;
  real_cost: string;
};

const fmt = (n: number) => n.toLocaleString();
const zero = (): Total => ({tokens: 0, cost: 0});

export function month_start_ms() {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1);
}

function db_path() {
  const raw = process.env.OPENCODE_DB;
  if (raw && path.isAbsolute(raw)) {
    return raw;
  }
  return path.join(
    process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"),
    "opencode",
    raw || "opencode.db",
  );
}

function sql(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}

function buckets(m: AssistantMessage): Buckets {
  const t = m.tokens;
  return {
    read: t.input || 0,
    read_cache: t.cache?.read || 0,
    write: (t.output || 0) + (t.reasoning || 0),
    write_cache: t.cache?.write || 0,
  };
}

function tokens(b: Buckets) {
  return b.read + b.read_cache + b.write + b.write_cache;
}

function cost(key: keyof typeof model_rates | undefined, b: Buckets) {
  const tier = key && model_rates[key];
  if (!tier) {
    return 0;
  }
  const r = b.read + b.read_cache > 256_000 ? tier[">256"] : tier["<256"];
  return (
    (b.read * r.input +
      b.read_cache * r.cache_read +
      b.write * r.output +
      b.write_cache * r.cache_write) /
    1_000_000
  );
}

function assistant_cost(m: AssistantMessage) {
  return cost(opencode_rate_key(m.modelID), buckets(m));
}

function cursor_cost(m: AssistantMessage) {
  return cost(cursor_rate_key(m.modelID), buckets(m));
}

function for_assistant_msgs(
  api: TuiPluginApi,
  session_id: string,
  opts: {since?: number},
  visit: (m: AssistantMessage) => void,
) {
  const {since} = opts;
  for (const m of api.state.session.messages(session_id)) {
    if (m.role !== "assistant") {
      continue;
    }
    if (since !== undefined && m.time.created < since) {
      continue;
    }
    visit(m as AssistantMessage);
  }
}

function db_total(p: {
  since?: number;
  exclude_session_id?: string;
  provider_id?: string;
  cursor_cost?: boolean;
}): DbTotal | undefined {
  const where = [`json_extract(data, '$.role') = 'assistant'`];
  if (p.exclude_session_id) {
    where.push(`session_id != ${sql(p.exclude_session_id)}`);
  }
  if (p.since !== undefined) {
    where.push(
      `CAST(json_extract(data, '$.time.created') AS INTEGER) >= ${p.since}`,
    );
  }
  if (p.provider_id) {
    where.push(
      `coalesce(lower(json_extract(data, '$.providerID')), '') = ${sql(p.provider_id)}`,
    );
  }
  try {
    const db = new Database(db_path(), {readonly: true});
    try {
      const rows = db
        .query<
          {data: string},
          []
        >(`SELECT data FROM message WHERE ${where.join(" AND ")}`)
        .all();
      const total_sessions =
        db.query<{c: number}, []>("SELECT COUNT(*) AS c FROM session").get()
          ?.c ?? 0;
      const total = zero();
      for (const row of rows) {
        try {
          const m = JSON.parse(row.data) as AssistantMessage;
          const b = buckets(m);
          total.tokens += tokens(b);
          total.cost += p.cursor_cost ? cursor_cost(m) : assistant_cost(m);
        } catch {
          //
        }
      }
      return {...total, total_sessions};
    } finally {
      db.close(true);
    }
  } catch {
    return undefined;
  }
}

function parse_csv(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map(
      line =>
        line
          .match(/("([^"]|"")*"|[^,])+/g)
          ?.map(s => s.replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [],
    );
}

const num = (v: string | undefined) => Number(v || 0) || 0;
const cursor_key_file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "keys",
  "cursor",
);

async function cursor_usage(range: DateRange): Promise<Total> {
  let token: string;
  try {
    token =
      (await Bun.file(cursor_key_file).text()).trim().split(/\r?\n/)[0] ?? "";
  } catch {
    return zero();
  }
  const start = range === "all-time" ? 0 : month_start_ms();
  const res = await fetch(
    `https://cursor.com/api/dashboard/export-usage-events-csv?startDate=${start}&endDate=${Date.now()}&strategy=tokens`,
    {
      headers: {
        accept: "text/csv,*/*",
        cookie: `WorkosCursorSessionToken=${token}`,
        referer: "https://cursor.com/dashboard/usage",
      },
    },
  );
  if (!res.ok) {
    return zero();
  }
  const rows = parse_csv(await res.text());
  const h = rows[0] ?? [];
  const i = (name: string) => h.indexOf(name);
  const [mi, icw, iwoc, cr, oi, ti] = [
    i("Model"),
    i("Input (w/ Cache Write)"),
    i("Input (w/o Cache Write)"),
    i("Cache Read"),
    i("Output Tokens"),
    i("Total Tokens"),
  ];
  if ([mi, icw, iwoc, cr, oi, ti].some(v => v < 0)) {
    return zero();
  }
  const total = zero();
  for (const row of rows.slice(1)) {
    const b = {
      read: num(row[iwoc]),
      read_cache: num(row[cr]),
      write: num(row[oi]),
      write_cache: num(row[icw]),
    };
    total.tokens += tokens(b) || num(row[ti]);
    total.cost += cost(cursor_rate_key(row[mi] ?? ""), b);
  }
  const overlap =
    db_total({
      since: range === "all-time" ? undefined : month_start_ms(),
      provider_id: "cursor",
      cursor_cost: true,
    }) ?? zero();
  return {
    tokens: Math.max(0, total.tokens - overlap.tokens),
    cost: Math.max(0, total.cost - overlap.cost),
  };
}

export function useTokenUsage({api}: {api: TuiPluginApi}) {
  return {
    session_measurements: ({
      session_id,
    }: {
      session_id: string;
    }): SessionSnapshot => {
      let cr = 0,
        cw = 0,
        ncr = 0,
        ncw = 0,
        reported = 0,
        rc = 0;
      let total = 0;
      for_assistant_msgs(api, session_id, {}, m => {
        const b = buckets(m);
        cr += b.read_cache;
        cw += b.write_cache;
        ncr += b.read;
        ncw += b.write;
        total += tokens(b);
        reported += m.cost;
        rc += cost(opencode_rate_key(m.modelID), b);
      });
      return {
        total_tokens: fmt(total),
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
      for_assistant_msgs(api, session_id, {since}, m => {
        const b = buckets(m);
        tokens += b.read + b.read_cache + b.write + b.write_cache;
        cost += assistant_cost(m);
      });
      return {tokens, cost};
    },

    sessions_total: (p: {
      is_cancelled: () => boolean;
      exclude_session_id?: string;
    }) => {
      if (p.is_cancelled()) {
        return undefined;
      }
      return db_total({exclude_session_id: p.exclude_session_id});
    },

    sessions_total_month: (p: {
      is_cancelled: () => boolean;
      exclude_session_id?: string;
    }) => {
      if (p.is_cancelled()) {
        return undefined;
      }
      return db_total({
        since: month_start_ms(),
        exclude_session_id: p.exclude_session_id,
      });
    },

    cursor_usage: (range?: DateRange) => cursor_usage(range ?? "current-month"),
  };
}
