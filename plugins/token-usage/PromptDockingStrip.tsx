import type {TuiPluginApi, TuiSlotContext} from "@opencode-ai/plugin/tui";
import {createEffect, createMemo, createSignal} from "solid-js";
import {useTokenUsage} from "./useTokenUsage";

export const PromptDockingStrip = (props: {
  api: TuiPluginApi;
  ctx: TuiSlotContext;
  session_id: string;
}) => {
  const t = createMemo(() => props.ctx.theme.current);
  const {session_measurements, sessions_total_month, cursor_usage} =
    useTokenUsage({api: props.api});
  const [total, set_total] = createSignal(0);
  const [cursor, set_cursor] = createSignal(0);
  const snap = createMemo(() =>
    session_measurements({session_id: props.session_id}),
  );

  createEffect(() => {
    const _c = props.api.state.session.count();
    void _c;
    let cancelled = false;
    (async () => {
      const [r, c] = await Promise.all([
        sessions_total_month({
          is_cancelled: () => cancelled,
          exclude_session_id: props.session_id,
        }),
        cursor_usage("current-month"),
      ]);
      if (!cancelled) {
        if (r) {
          set_total(r.cost);
        }
        set_cursor(c.cost);
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  const grand = createMemo(() => total() + cursor());

  return (
    <box flexDirection="row" flexWrap="wrap" alignItems="center">
      <text fg={t().primary}>{snap()?.real_cost ?? "—"}</text>
      <text fg={t().textMuted}> / </text>
      <text fg={t().primary}>
        {!total() && !cursor()
          ? ""
          : grand() === 0
            ? "(SUB)"
            : `$${grand().toFixed(5)}`}
      </text>
    </box>
  );
};
