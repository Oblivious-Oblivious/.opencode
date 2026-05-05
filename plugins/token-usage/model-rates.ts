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
  "hy3-preview-free": free,
  "ling-2.6-flash-free": free,
  "minimax-m2.5-free": free,
  "nemotron-3-super-free": free,
  "trinity-large-preview-free": free,
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
  "gpt-4.1": {
    "<256": {input: 2, output: 8, cache_read: 0.5, cache_write: 0},
    ">256": {input: 2, output: 8, cache_read: 0.5, cache_write: 0},
  },
  o3: {
    "<256": {input: 2, output: 8, cache_read: 0.5, cache_write: 0},
    ">256": {input: 2, output: 8, cache_read: 0.5, cache_write: 0},
  },
  "o3-mini": {
    "<256": {input: 1.1, output: 4.4, cache_read: 0.55, cache_write: 0},
    ">256": {input: 1.1, output: 4.4, cache_read: 0.55, cache_write: 0},
  },
  "o4-mini": {
    "<256": {input: 1.1, output: 4.4, cache_read: 0.28, cache_write: 0},
    ">256": {input: 1.1, output: 4.4, cache_read: 0.28, cache_write: 0},
  },
  "claude-3-5-sonnet": {
    "<256": {input: 3, output: 15, cache_read: 0.3, cache_write: 3.75},
    ">256": {input: 3, output: 15, cache_read: 0.3, cache_write: 3.75},
  },
  "claude-4-sonnet": {
    "<256": {input: 3, output: 15, cache_read: 0.3, cache_write: 3.75},
    ">256": {input: 3, output: 15, cache_read: 0.3, cache_write: 3.75},
  },
  "gemini-2.5-pro": {
    "<256": {input: 1.25, output: 10, cache_read: 0.13, cache_write: 0},
    ">256": {input: 2.5, output: 15, cache_read: 0.25, cache_write: 0},
  },
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
  "mimo-v2.5-pro": {
    "<256": {input: 1, output: 3, cache_read: 0.2, cache_write: 0},
    ">256": {input: 2, output: 6, cache_read: 0.4, cache_write: 0},
  },
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

export type ModelRateKey = keyof typeof model_rates;

const cursor_rules: readonly {match: RegExp; key: ModelRateKey}[] = [
  {match: /^no charge$|^not charged$/i, key: "hy3-preview-free"},
  {match: /^glm-5v-turbo$/i, key: "glm-5v-turbo"},
  {match: /^glm-4\.?6v/i, key: "glm-4.6v"},
  {match: /^glm-/i, key: "glm-5.1"},
  {match: /^o4-mini$/i, key: "o4-mini"},
  {match: /^o3-mini$/i, key: "o3-mini"},
  {match: /^o3$/i, key: "o3"},
  {match: /^gpt-4\.1$/i, key: "gpt-4.1"},
  {match: /^gpt-5\.5.*(?:xhigh|pro)(?:$|-)/i, key: "gpt-5.5-pro"},
  {match: /^gpt-5\.5/i, key: "gpt-5.5"},
  {match: /^gpt-5\.4.*(?:pro|xhigh)/i, key: "gpt-5.4-pro"},
  {match: /^gpt-5\.4.*mini/i, key: "gpt-5.4-mini"},
  {match: /^gpt-5\.4.*nano/i, key: "gpt-5.4-nano"},
  {match: /^gpt-5\.4/i, key: "gpt-5.4"},
  {match: /^gpt-5\.[123].*codex/i, key: "gpt-5.4"},
  {match: /^gpt-5-codex/i, key: "gpt-5.4"},
  {match: /^gpt-5-(?:high|fast)/i, key: "gpt-5.5"},
  {match: /^gpt-5(?:$|-)/i, key: "gpt-5.5"},
  {match: /^composer-2-fast$/i, key: "composer-2-fast"},
  {match: /^composer-2$/i, key: "composer-2"},
  {match: /^composer-1\.5$/i, key: "composer-2"},
  {match: /^composer-1$/i, key: "composer-2"},
  {match: /^auto$/i, key: "auto"},
  {match: /claude-4-opus/i, key: "claude-opus-4-5"},
  {match: /opus.*4[-.]?7|4[-.]?7.*opus/i, key: "claude-opus-4-7"},
  {match: /opus.*4[-.]?6|4[-.]?6.*opus/i, key: "claude-opus-4-6"},
  {match: /opus.*4[-.]?5|4[-.]?5.*opus/i, key: "claude-opus-4-5"},
  {match: /haiku/i, key: "claude-haiku-4-5"},
  {match: /sonnet.*4[-.]?6|4[-.]?6.*sonnet/i, key: "claude-sonnet-4-6"},
  {match: /sonnet.*4[-.]?5|4[-.]?5.*sonnet/i, key: "claude-sonnet-4-5"},
  {match: /sonnet.*4[^.]|^claude-4-sonnet/i, key: "claude-4-sonnet"},
  {
    match: /3-5-sonnet-20241022|3\.5-sonnet.*20241022/i,
    key: "claude-3-5-sonnet",
  },
  {match: /3\.7-sonnet|3-7-sonnet/i, key: "claude-3-5-sonnet"},
  {match: /3\.5-sonnet/i, key: "claude-3-5-sonnet"},
  {match: /^gemini-3\.1-pro/i, key: "gemini-3.1-pro"},
  {match: /^gemini-3(?!\.1-pro)/i, key: "gemini-3.1-pro"},
  {match: /^gemini-2\.5/i, key: "gemini-2.5-pro"},
  {match: /^gemini-2\.0/i, key: "gemini-2.5-pro"},
  {match: /^deepseek/i, key: "deepseek-v4-pro"},
  {match: /^kimi-k2/i, key: "kimi-k2.6"},
  {match: /^minimax-m2\.7/i, key: "minimax-m2.7"},
  {match: /^qwen3/i, key: "qwen3.6-plus"},
  {match: /^mimo/i, key: "mimo-v2.5-pro"},
  {match: /^hy3/i, key: "hy3-preview-free"},
  {match: /^ling-2\.6/i, key: "ling-2.6-flash-free"},
  {match: /^minimax-m2\.5-free/i, key: "minimax-m2.5-free"},
  {match: /^nemotron/i, key: "nemotron-3-super-free"},
  {match: /^trinity/i, key: "trinity-large-preview-free"},
];

export function opencode_rate_key(raw: string): ModelRateKey | undefined {
  const name = raw.trim().toLowerCase();
  const suffix = name.slice(name.lastIndexOf("/") + 1);
  return model_rates[name as ModelRateKey]
    ? (name as ModelRateKey)
    : model_rates[suffix as ModelRateKey]
      ? (suffix as ModelRateKey)
      : undefined;
}

export function cursor_rate_key(raw: string): ModelRateKey | undefined {
  const name = raw.trim();
  if (!name || name === "unknown") {
    return undefined;
  }
  if (model_rates[name as ModelRateKey]) {
    return name as ModelRateKey;
  }
  const lower = name.toLowerCase();
  for (const key of Object.keys(model_rates) as ModelRateKey[]) {
    if (key.toLowerCase() === lower) {
      return key;
    }
  }
  return cursor_rules.find(({match}) => match.test(name))?.key;
}
