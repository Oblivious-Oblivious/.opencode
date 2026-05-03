import type {Plugin} from "@opencode-ai/plugin";

export const ImageDropFullPathPlugin: Plugin = async () => {
  return {
    "chat.message": async (_input, output) => {
      const path_map = new Map<string, string>();

      for (const part of output.parts) {
        if (
          part.type === "file" &&
          part.source?.type === "file" &&
          part.source.path
        ) {
          const full_path = part.source.path;
          const basename = full_path.split(/[/\\]/).pop() || full_path;

          path_map.set(basename, full_path);
          part.filename = full_path;
        }
      }

      const message = output.message as {files?: string[]};

      if (message.files) {
        message.files = message.files.map(file_path => {
          const basename = file_path.split(/[/\\]/).pop() || file_path;

          return path_map.get(basename) ?? file_path;
        });
      }
    },
  };
};
