import type {AssistantMessage} from "@opencode-ai/sdk/v2";
import {execFileSync} from "node:child_process";
import {existsSync} from "node:fs";
import os from "node:os";
import path from "node:path";

export type SessionsDbTotal = {
  cost: number;
  tokens: number;
  total_sessions: number;
};

export function default_opencode_db_path() {
  const raw = process.env.OPENCODE_DB;
  if (raw && path.isAbsolute(raw)) {
    return raw;
  }
  const data_root = process.env.XDG_DATA_HOME
    ? path.join(process.env.XDG_DATA_HOME, "opencode")
    : path.join(os.homedir(), ".local", "share", "opencode");
  return path.join(data_root, raw || "opencode.db");
}

function sql_string_literal(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}

function message_where_clause(opts: {
  exclude_session_id?: string;
  since?: number;
}) {
  const parts = [`json_extract(data, '$.role') = 'assistant'`];
  if (opts.exclude_session_id) {
    parts.push(`session_id != ${sql_string_literal(opts.exclude_session_id)}`);
  }
  if (opts.since !== undefined) {
    parts.push(
      `CAST(json_extract(data, '$.time.created') AS INTEGER) >= ${Number(opts.since)}`,
    );
  }
  return parts.join(" AND ");
}

export function tally_opencode_sqlite(p: {
  db_path: string;
  since?: number;
  exclude_session_id?: string;
  real_cost: (m: AssistantMessage) => number;
}): SessionsDbTotal | undefined {
  if (!existsSync(p.db_path)) {
    return undefined;
  }
  const msgs_sql = `SELECT data FROM message WHERE ${message_where_clause({
    exclude_session_id: p.exclude_session_id,
    since: p.since,
  })}`;
  const sqlite_bin = process.env.SQLITE3_PATH ?? "sqlite3";
  let rows: {data: string}[];
  try {
    const stdout = execFileSync(sqlite_bin, [p.db_path, "-json", msgs_sql], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
    rows = stdout.trim() ? (JSON.parse(stdout) as {data: string}[]) : [];
  } catch {
    return undefined;
  }
  let total_sessions: number;
  try {
    const s_stdout = execFileSync(
      sqlite_bin,
      [p.db_path, "-json", "SELECT COUNT(*) AS c FROM session"],
      {encoding: "utf8", maxBuffer: 1024 * 1024},
    );
    total_sessions = (JSON.parse(s_stdout.trim()) as {c: number}[])[0]?.c ?? 0;
  } catch {
    total_sessions = 0;
  }
  let tokens = 0,
    cost = 0;
  for (const row of rows) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.data);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") {
      continue;
    }
    const m = parsed as AssistantMessage;
    if (m.role !== "assistant") {
      continue;
    }
    const tk = m.tokens;
    if (!tk) {
      continue;
    }
    tokens +=
      tk.input +
      tk.output +
      tk.reasoning +
      (tk.cache?.read ?? 0) +
      (tk.cache?.write ?? 0);
    cost += p.real_cost(m);
  }
  return {cost, tokens, total_sessions};
}
