import type {
  TuiPluginApi,
  TuiPluginModule,
  TuiSlotContext,
} from "@opencode-ai/plugin/tui";
import {createEffect, createMemo, createSignal} from "solid-js";
import {month_start_ms, useTokenUsage} from "./useTokenUsage";

type Props = {api: TuiPluginApi; ctx: TuiSlotContext; session_id: string};

const PromptTotals = (props: Props & {mode: "tokens" | "cost"}) => {
  const t = createMemo(() => props.ctx.theme.current);
  const u = useTokenUsage({api: props.api});
  const [base, set_base] = createSignal<{tokens: number; cost: number}>();
  const [cursor, set_cursor] = createSignal<{tokens: number; cost: number}>();
  const live = createMemo(() =>
    u.live_session_totals({session_id: props.session_id}),
  );
  const snap = createMemo(() =>
    u.session_measurements({session_id: props.session_id}),
  );

  createEffect(() => {
    props.api.state.session.count();
    let cancelled = false;
    (async () => {
      const [b, c] = await Promise.all([
        u.sessions_total_month({
          is_cancelled: () => cancelled,
          exclude_session_id: props.session_id,
        }),
        u.cursor_usage("current-month"),
      ]);
      if (!cancelled) {
        set_base(b ?? {tokens: 0, cost: 0});
        set_cursor(c);
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  if (props.mode === "cost") {
    const total = createMemo(() => (base()?.cost ?? 0) + (cursor()?.cost ?? 0));
    const ready = createMemo(() => base() && cursor());
    return (
      <box flexDirection="row" flexWrap="wrap" alignItems="center">
        <text fg={t().primary}>{ready() ? snap().real_cost : ""}</text>
        <text fg={t().textMuted}> / </text>
        <text fg={t().primary}>
          {ready() && total() ? `$${total().toFixed(5)}` : ""}
        </text>
      </box>
    );
  }

  const total = createMemo(
    () => (base()?.tokens ?? 0) + (cursor()?.tokens ?? 0) + live().tokens,
  );
  const ready = createMemo(() => base() && cursor());
  return (
    <box flexDirection="row" flexWrap="wrap" alignItems="center" flexShrink={0}>
      <text fg={t().textMuted} wrapMode="none">
        T ·
      </text>
      <text></text>
      <text fg={t().text} wrapMode="none">
        {ready()
          ? `${live().tokens.toLocaleString()} / ${total().toLocaleString()}`
          : ""}
      </text>
    </box>
  );
};

const SidePanel = (props: Props) => {
  const t = createMemo(() => props.ctx.theme.current);
  const u = useTokenUsage({api: props.api});
  const [all, set_all] = createSignal<{
    tokens: number;
    cost: number;
    total_sessions: number;
  }>();
  const [month, set_month] = createSignal<{tokens: number; cost: number}>();
  const [cursor_all, set_cursor_all] = createSignal<{
    tokens: number;
    cost: number;
  }>();
  const [cursor_month, set_cursor_month] = createSignal<{
    tokens: number;
    cost: number;
  }>();
  const current = createMemo(() =>
    u.session_measurements({session_id: props.session_id}),
  );
  const live_all = createMemo(() =>
    u.live_session_totals({session_id: props.session_id}),
  );
  const live_month = createMemo(() =>
    u.live_session_totals({
      session_id: props.session_id,
      since: month_start_ms(),
    }),
  );
  const sum_month = createMemo(() => ({
    tokens:
      (month()?.tokens ?? 0) +
      (cursor_month()?.tokens ?? 0) +
      live_month().tokens,
    cost:
      (month()?.cost ?? 0) + (cursor_month()?.cost ?? 0) + live_month().cost,
  }));
  const sum_all = createMemo(() => ({
    tokens:
      (all()?.tokens ?? 0) + (cursor_all()?.tokens ?? 0) + live_all().tokens,
    cost: (all()?.cost ?? 0) + (cursor_all()?.cost ?? 0) + live_all().cost,
  }));
  const ready = createMemo(
    () => all() && month() && cursor_all() && cursor_month(),
  );

  createEffect(() => {
    props.api.state.session.count();
    let cancelled = false;
    (async () => {
      const [a, m, ca, cm] = await Promise.all([
        u.sessions_total({
          is_cancelled: () => cancelled,
          exclude_session_id: props.session_id,
        }),
        u.sessions_total_month({
          is_cancelled: () => cancelled,
          exclude_session_id: props.session_id,
        }),
        u.cursor_usage("all-time"),
        u.cursor_usage("current-month"),
      ]);
      if (!cancelled) {
        set_all(a ?? {tokens: 0, cost: 0, total_sessions: 0});
        set_month(m ?? {tokens: 0, cost: 0});
        set_cursor_all(ca);
        set_cursor_month(cm);
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  const cost = (n: number) => (n ? `$${n.toFixed(5)}` : "(SUB)");
  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <text fg={t().textMuted}>No. sessions: </text>
        <text fg={t().text}>{ready() ? all()?.total_sessions : ""}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Tokens (30d): </text>
        <text fg={t().text}>
          {ready() ? sum_month().tokens.toLocaleString() : ""}
        </text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Cost (30d): </text>
        <box width={2} />
        <text fg={t().primary}>{ready() ? cost(sum_month().cost) : ""}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Tokens (all): </text>
        <text fg={t().text}>
          {ready() ? sum_all().tokens.toLocaleString() : ""}
        </text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Cost (all): </text>
        <box width={2} />
        <text fg={t().primary}>{ready() ? cost(sum_all().cost) : ""}</text>
      </box>
      <box height={1} />
      <box flexDirection="row">
        <text fg={t().textMuted}>Tokens: {"     "} </text>
        <text fg={t().text}>{current().total_tokens}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Cached: {"     "} R </text>
        <text fg={t().text}>{current().cache_read}</text>
        <text fg={t().textMuted}> · W </text>
        <text fg={t().text}>{current().cache_write}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>{"Non-Cached:   R "}</text>
        <text fg={t().text}>{current().non_cached_read}</text>
        <text fg={t().textMuted}> · W </text>
        <text fg={t().text}>{current().non_cached_write}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Cost: {"       "} </text>
        <text fg={t().text}>{current().cost_reported}</text>
      </box>
      <box flexDirection="row">
        <text fg={t().textMuted}>Real Cost: {"  "} </text>
        <text fg={t().primary}>{current().real_cost}</text>
      </box>
    </box>
  );
};

const plugin: TuiPluginModule = {
  id: "fourth-wall.token-usage",
  tui: async api => {
    api.slots.register({
      order: 110,
      slots: {
        sidebar_content(ctx, value) {
          return (
            <SidePanel api={api} ctx={ctx} session_id={value.session_id} />
          );
        },
        session_prompt(ctx, value) {
          return (
            <api.ui.Prompt
              ref={value.ref}
              sessionID={value.session_id}
              visible={value.visible}
              disabled={value.disabled}
              onSubmit={value.on_submit}
              right={
                <api.ui.Slot
                  name="session_prompt_right"
                  session_id={value.session_id}
                />
              }
              hint={
                <PromptTotals
                  api={api}
                  ctx={ctx}
                  session_id={value.session_id}
                  mode="tokens"
                />
              }
            />
          );
        },
        session_prompt_right(ctx, value) {
          return (
            <PromptTotals
              api={api}
              ctx={ctx}
              session_id={value.session_id}
              mode="cost"
            />
          );
        },
      },
    });
  },
};

export default plugin;
