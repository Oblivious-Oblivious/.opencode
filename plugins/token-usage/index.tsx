import type {TuiPluginModule} from "@opencode-ai/plugin/tui";
import {BottomCacheStrip} from "./BottomCacheStrip";
import {PromptDockingStrip} from "./PromptDockingStrip";
import {SidePanel} from "./SidePanel";

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
                <BottomCacheStrip
                  api={api}
                  ctx={ctx}
                  session_id={value.session_id}
                />
              }
            />
          );
        },
        session_prompt_right(ctx, value) {
          return (
            <PromptDockingStrip
              api={api}
              ctx={ctx}
              session_id={value.session_id}
            />
          );
        },
      },
    });
  },
};

export default plugin;
