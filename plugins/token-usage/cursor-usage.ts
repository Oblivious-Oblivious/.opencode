import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {model_rates} from "./model-rates";

const cursor_session_token_path = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "keys",
  "cursor",
);

function read_cursor_session_token(): string {
  try {
    return readFileSync(cursor_session_token_path, "utf-8").trim();
  } catch {
    return "";
  }
}

export type CursorUsage = {tokens: number; cost: number};
export type DateRange = "current-month" | "all-time";

const cache = new Map<DateRange, {value: CursorUsage; at: number}>();

export function month_start_ms(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

const MODEL_PATTERNS: [RegExp, string][] = [
  [/^(gpt-\d+\.\d+)-\w+$/, "$1"],
  [
    /^claude-(\d+)\.(\d+)-(haiku|sonnet|opus)(?:-\w+)?(?:-thinking)?$/,
    "claude-$3-$1-$2",
  ],
  [/^(claude-(?:haiku|sonnet|opus)-\d+-\d+)-thinking-\w+$/, "$1"],
  [/^(gemini-\d+\.\d+-pro)-preview$/, "$1"],
];

function normalize_model(raw: string): string | undefined {
  const m = raw.trim().toLowerCase().replace(/"/g, "");
  if (!m || m === "model" || m === "no charge") {
    return undefined;
  }
  for (const [re, repl] of MODEL_PATTERNS) {
    const r = m.replace(re, repl);
    if (r !== m && model_rates[r]) {
      return r;
    }
  }
  return model_rates[m] ? m : undefined;
}

function model_cost(
  key: string,
  input: number,
  output: number,
  cache_read: number,
  cache_write: number,
): number {
  const tier = model_rates[key];
  if (!tier) {
    return 0;
  }
  const r = input + cache_read > 256_000 ? tier[">256"] : tier["<256"];
  return (
    (input * r.input +
      output * r.output +
      cache_read * r.cache_read +
      cache_write * r.cache_write) /
    1e6
  );
}

const num = (v: string) => {
  const n = Number(v.replace(/"/g, "").trim());
  return Number.isNaN(n) ? 0 : n;
};

export async function get_cursor_usage(
  range: DateRange = "current-month",
): Promise<CursorUsage> {
  const token = read_cursor_session_token();
  if (!token) {
    return {tokens: 0, cost: 0};
  }

  const now = Date.now();
  const c = cache.get(range);
  if (c && now - c.at < 60_000) {
    return c.value;
  }

  try {
    const end = now.toString();
    const start = range === "all-time" ? "0" : month_start_ms().toString();
    const res = await fetch(
      `https://cursor.com/api/dashboard/export-usage-events-csv?startDate=${start}&endDate=${end}&strategy=tokens`,
      {
        headers: {
          accept: "text/csv,*/*",
          cookie: `WorkosCursorSessionToken=${token}`,
          referer: "https://cursor.com/dashboard/usage",
        },
      },
    );
    const lines = (await res.text()).split("\n");
    if (lines.length < 2) {
      return {tokens: 0, cost: 0};
    }

    const h = lines[0].split(",").map(s => s.trim());
    const idx = (name: string) => h.indexOf(name);
    const mi = idx("Model"),
      icw = idx("Input (w/ Cache Write)"),
      iwoc = idx("Input (w/o Cache Write)"),
      cr = idx("Cache Read"),
      oi = idx("Output Tokens"),
      ti = idx("Total Tokens");
    if ([mi, icw, iwoc, cr, oi, ti].includes(-1)) {
      return {tokens: 0, cost: 0};
    }

    let tokens = 0,
      cost = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }
      const c = line.split(",");
      if (c.length <= ti) {
        continue;
      }
      const key = normalize_model(c[mi]);
      if (!key) {
        continue;
      }
      tokens += num(c[ti]);
      cost += model_cost(
        key,
        num(c[iwoc]),
        num(c[oi]),
        num(c[cr]),
        num(c[icw]),
      );
    }
    const result = {tokens, cost};
    cache.set(range, {value: result, at: now});
    return result;
  } catch {
    return {tokens: 0, cost: 0};
  }
}
