type Rate = {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
};

type ModelRates = Record<string, {"<256": Rate; ">256": Rate}>;

const free = {
  "<256": {input: 0, output: 0, cache_read: 0, cache_write: 0},
  ">256": {input: 0, output: 0, cache_read: 0, cache_write: 0},
};

export const model_rates: ModelRates = {
  // free
  "hy3-preview-free": free,
  "ling-2.6-flash-free": free,
  "minimax-m2.5-free": free,
  "nemotron-3-super-free": free,
  "trinity-large-preview-free": free,

  // cursor
  auto: {
    "<256": {input: 1.25, output: 6, cache_read: 0.25, cache_write: 1.25},
    ">256": {input: 1.25, output: 6, cache_read: 0.25, cache_write: 1.25},
  },
  "composer-2": {
    "<256": {input: 0.5, output: 2.5, cache_read: 0.2, cache_write: 0},
    ">256": {input: 0.5, output: 2.5, cache_read: 0.2, cache_write: 0},
  },
  "composer-2-fast": {
    "<256": {input: 1.5, output: 7.5, cache_read: 0.35, cache_write: 0},
    ">256": {input: 1.5, output: 7.5, cache_read: 0.35, cache_write: 0},
  },

  // opencode zen
  "claude-haiku-4-5": {
    "<256": {input: 1, output: 5, cache_read: 0.1, cache_write: 1.25},
    ">256": {input: 1, output: 5, cache_read: 0.1, cache_write: 1.25},
  },
  "claude-opus-4-5": {
    "<256": {input: 5, output: 25, cache_read: 0.5, cache_write: 6.25},
    ">256": {input: 5, output: 25, cache_read: 0.5, cache_write: 6.25},
  },
  "claude-opus-4-6": {
    "<256": {input: 5, output: 25, cache_read: 0.5, cache_write: 6.25},
    ">256": {input: 5, output: 25, cache_read: 0.5, cache_write: 6.25},
  },
  "claude-opus-4-7": {
    "<256": {input: 5, output: 25, cache_read: 0.5, cache_write: 6.25},
    ">256": {input: 5, output: 25, cache_read: 0.5, cache_write: 6.25},
  },
  "claude-sonnet-4-5": {
    "<256": {input: 3, output: 15, cache_read: 0.3, cache_write: 3.75},
    ">256": {input: 6, output: 22.5, cache_read: 0.6, cache_write: 7.5},
  },
  "claude-sonnet-4-6": {
    "<256": {input: 3, output: 15, cache_read: 0.3, cache_write: 3.75},
    ">256": {input: 6, output: 22.5, cache_read: 0.6, cache_write: 7.5},
  },
  "gemini-3.1-pro": {
    "<256": {input: 2, output: 12, cache_read: 0.2, cache_write: 0},
    ">256": {input: 4, output: 18, cache_read: 0.4, cache_write: 0},
  },
  "gpt-5.4": {
    "<256": {input: 2.5, output: 15, cache_read: 0.25, cache_write: 0},
    ">256": {input: 5, output: 22.5, cache_read: 0.5, cache_write: 0},
  },
  "gpt-5.4-mini": {
    "<256": {input: 0.75, output: 4.5, cache_read: 0.075, cache_write: 0},
    ">256": {input: 0.75, output: 4.5, cache_read: 0.075, cache_write: 0},
  },
  "gpt-5.4-nano": {
    "<256": {input: 0.2, output: 1.25, cache_read: 0.02, cache_write: 0},
    ">256": {input: 0.2, output: 1.25, cache_read: 0.02, cache_write: 0},
  },
  "gpt-5.4-pro": {
    "<256": {input: 30, output: 180, cache_read: 0, cache_write: 0},
    ">256": {input: 60, output: 270, cache_read: 0, cache_write: 0},
  },
  "gpt-5.5": {
    "<256": {input: 5, output: 30, cache_read: 0.5, cache_write: 0},
    ">256": {input: 10, output: 45, cache_read: 1, cache_write: 0},
  },
  "gpt-5.5-pro": {
    "<256": {input: 30, output: 180, cache_read: 0, cache_write: 0},
    ">256": {input: 30, output: 180, cache_read: 0, cache_write: 0},
  },

  // opencode go
  "deepseek-v4-pro": {
    "<256": {input: 1.74, output: 3.48, cache_read: 0.145, cache_write: 0},
    ">256": {input: 1.74, output: 3.48, cache_read: 0.145, cache_write: 0},
  },
  "kimi-k2.6": {
    "<256": {input: 0.95, output: 4, cache_read: 0.16, cache_write: 0},
    ">256": {input: 0.95, output: 4, cache_read: 0.16, cache_write: 0},
  },
  "minimax-m2.7": {
    "<256": {input: 0.3, output: 1.2, cache_read: 0.06, cache_write: 0},
    ">256": {input: 0.3, output: 1.2, cache_read: 0.06, cache_write: 0},
  },
  "qwen3.6-plus": {
    "<256": {input: 0.5, output: 3, cache_read: 0.625, cache_write: 0},
    ">256": {input: 2, output: 6, cache_read: 2.5, cache_write: 0},
  },

  // xiaomi
  "mimo-v2.5-pro": {
    "<256": {input: 1, output: 3, cache_read: 0.2, cache_write: 0},
    ">256": {input: 2, output: 6, cache_read: 0.4, cache_write: 0},
  },

  // z.ai
  "glm-4.6v": {
    "<256": {input: 0.3, output: 0.9, cache_read: 0.05, cache_write: 0},
    ">256": {input: 0.3, output: 0.9, cache_read: 0.05, cache_write: 0},
  },
  "glm-5v-turbo": {
    "<256": {input: 1.2, output: 4, cache_read: 0.24, cache_write: 0},
    ">256": {input: 1.2, output: 4, cache_read: 0.24, cache_write: 0},
  },
  "glm-5.1": {
    "<256": {input: 1.4, output: 4.4, cache_read: 0.26, cache_write: 0},
    ">256": {input: 1.4, output: 4.4, cache_read: 0.26, cache_write: 0},
  },
};
