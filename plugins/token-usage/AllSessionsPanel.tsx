import type {TuiPluginApi, TuiSlotContext} from "@opencode-ai/plugin/tui";
import {createEffect, createMemo, createSignal} from "solid-js";
import {month_start_ms} from "./cursor-usage";
import {useTokenUsage} from "./useTokenUsage";

export const AllSessionsPanel = (props: {
  api: TuiPluginApi;
  ctx: TuiSlotContext;
  session_id: string;
}) => {
  const t = createMemo(() => props.ctx.theme.current);
  const {
    sessions_total,
    sessions_total_month,
    cursor_usage,
    live_session_totals,
  } = useTokenUsage({
    api: props.api,
  });

  const [all, set_all] = createSignal({tokens: 0, cost: 0, sessions: 0});
  const [month, set_month] = createSignal({tokens: 0, cost: 0});
  const [cursor_all, set_cursor_all] = createSignal({tokens: 0, cost: 0});
  const [cursor_month, set_cursor_month] = createSignal({tokens: 0, cost: 0});

  const live_all = createMemo(() =>
    live_session_totals({session_id: props.session_id}),
  );
  const live_month = createMemo(() =>
    live_session_totals({
      session_id: props.session_id,
      since: month_start_ms(),
    }),
  );

  createEffect(() => {
    const _c = props.api.state.session.count();
    void _c;
    let cancelled = false;
    (async () => {
      const [r_all, r_month, c_all, c_month] = await Promise.all([
        sessions_total({
          is_cancelled: () => cancelled,
          exclude_session_id: props.session_id,
        }),
        sessions_total_month({
          is_cancelled: () => cancelled,
          exclude_session_id: props.session_id,
        }),
        cursor_usage("all-time"),
        cursor_usage("current-month"),
      ]);
      if (cancelled) {
        return;
      }
      if (r_all) {
        set_all(v => ({
          ...v,
          tokens: r_all.tokens,
          cost: r_all.cost,
          sessions: r_all.total_sessions,
        }));
      }
      if (r_month) {
        set_month(v => ({...v, tokens: r_month.tokens, cost: r_month.cost}));
      }
      set_cursor_all(c_all);
      set_cursor_month(c_month);
    })();
    return () => {
      cancelled = true;
    };
  });

  const sum_month = createMemo(() => ({
    tokens: month().tokens + cursor_month().tokens + live_month().tokens,
    cost: month().cost + cursor_month().cost + live_month().cost,
  }));
  const sum_all = createMemo(() => ({
    tokens: all().tokens + cursor_all().tokens + live_all().tokens,
    cost: all().cost + cursor_all().cost + live_all().cost,
  }));

  const fmt_cost = (c: number, has_data: boolean) =>
    !has_data ? "" : c === 0 ? "(SUB)" : `$${c.toFixed(5)}`;
  const has_month = () => month().tokens > 0 || cursor_month().tokens > 0;
  const has_all = () => all().tokens > 0 || cursor_all().tokens > 0;

  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <text fg={t().textMuted}>No. sessions: </text>
        <text fg={t().text}>
          {all().sessions === 0 ? "" : all().sessions.toLocaleString()}
        </text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Tokens (30d): </text>
        <text fg={t().text}>
          {!has_month() ? "" : sum_month().tokens.toLocaleString()}
        </text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Cost (30d): </text>
        <box width={2} />
        <text fg={t().primary}>{fmt_cost(sum_month().cost, has_month())}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Tokens (all): </text>
        <text fg={t().text}>
          {!has_all() ? "" : sum_all().tokens.toLocaleString()}
        </text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Cost (all): </text>
        <box width={2} />
        <text fg={t().primary}>{fmt_cost(sum_all().cost, has_all())}</text>
      </box>
    </box>
  );
};
