import type {TuiPluginApi, TuiSlotContext} from "@opencode-ai/plugin/tui";
import {createMemo} from "solid-js";
import {AllSessionsPanel} from "./AllSessionsPanel";
import {useTokenUsage} from "./useTokenUsage";

export const SidePanel = (props: {
  api: TuiPluginApi;
  ctx: TuiSlotContext;
  session_id: string;
}) => {
  const t = createMemo(() => props.ctx.theme.current);
  const {session_measurements} = useTokenUsage({api: props.api});
  const current = createMemo(() =>
    session_measurements({session_id: props.session_id}),
  );

  return (
    <box flexDirection="column">
      <AllSessionsPanel
        api={props.api}
        ctx={props.ctx}
        session_id={props.session_id}
      />

      <box height={1} />

      <box flexDirection="row">
        <text fg={t().textMuted}>Tokens: {"     "} </text>
        <text fg={t().text}>{current()?.total_tokens ?? "—"}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Cached: {"     "} R </text>
        <text fg={t().text}>{current()?.cache_read ?? "—"}</text>
        <text fg={t().textMuted}> · W </text>
        <text fg={t().text}>{current()?.cache_write ?? "—"}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Non-Cached: </text>
        <text></text>
        <text></text>
        <text fg={t().textMuted}>R</text>
        <text></text>
        <text fg={t().text}>{current()?.non_cached_read ?? "—"}</text>
        <text fg={t().textMuted}> · W </text>
        <text fg={t().text}>{current()?.non_cached_write ?? "—"}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Cost: {"       "} </text>
        <text fg={t().text}>{current()?.cost_reported ?? "—"}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Real Cost: {"  "} </text>
        <text fg={t().primary}>{current()?.real_cost ?? "—"}</text>
      </box>
    </box>
  );
};
