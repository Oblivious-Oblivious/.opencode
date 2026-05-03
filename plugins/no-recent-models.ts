import type {Plugin} from "@opencode-ai/plugin";
import {readFileSync, writeFileSync} from "node:fs";
import os from "os";
import path from "path";

const model_json_path = path.join(
  os.homedir(),
  ".local",
  "state",
  "opencode",
  "model.json",
);

export const NoRecentModelsPlugin: Plugin = async () => {
  return {
    event: async () => {
      try {
        const raw = readFileSync(model_json_path, "utf-8");
        const data = JSON.parse(raw);
        if (Array.isArray(data.recent) && data.recent.length > 1) {
          data.recent = [data.recent[0]];
          writeFileSync(model_json_path, JSON.stringify(data, null, 2) + "\n");
        }
      } catch {
        // file doesn't exist yet, nothing to clear
      }
    },
  };
};
