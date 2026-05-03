import type {TuiPluginApi, TuiSlotContext} from "@opencode-ai/plugin/tui";
import {createEffect, createMemo, createSignal} from "solid-js";
import {useTokenUsage} from "./useTokenUsage";

export const BottomCacheStrip = (props: {
  api: TuiPluginApi;
  ctx: TuiSlotContext;
  session_id: string;
}) => {
  const t = createMemo(() => props.ctx.theme.current);
  const {live_session_totals, sessions_total_month, cursor_usage} =
    useTokenUsage({api: props.api});
  const [total, set_total] = createSignal(0);
  const [cursor, set_cursor] = createSignal(0);

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
          set_total(r.tokens);
        }
        set_cursor(c.tokens);
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  const live = createMemo(() =>
    live_session_totals({session_id: props.session_id}),
  );
  const grand = createMemo(() => total() + cursor() + live().tokens);

  return (
    <box flexDirection="row" flexWrap="wrap" alignItems="center" flexShrink={0}>
      <text fg={t().textMuted} wrapMode="none">
        T ·
      </text>
      <text></text>
      <text fg={t().text} wrapMode="none">
        {live().tokens.toLocaleString()} /{" "}
        {!total() && !cursor() ? "" : grand().toLocaleString()}
      </text>
    </box>
  );
};
