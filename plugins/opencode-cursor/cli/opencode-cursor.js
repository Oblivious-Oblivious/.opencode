#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/utils/errors.ts
function stripAnsi(str) {
  if (typeof str !== "string")
    return String(str ?? "");
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}
function parseAgentError(stderr) {
  const input = typeof stderr === "string" ? stderr : String(stderr ?? "");
  const clean = stripAnsi(input).trim();
  if (clean.includes("usage limit") || clean.includes("hit your usage limit")) {
    const savingsMatch = clean.match(/saved \$(\d+(?:\.\d+)?)/i);
    const resetMatch = clean.match(/reset[^0-9]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const modelMatch = clean.match(/continue with (\w+)/i);
    const details = {};
    if (savingsMatch)
      details.savings = `$${savingsMatch[1]}`;
    if (resetMatch)
      details.resetDate = resetMatch[1];
    if (modelMatch)
      details.affectedModel = modelMatch[1];
    return {
      type: "quota",
      recoverable: false,
      message: clean,
      userMessage: "You've hit your Cursor usage limit",
      details,
      suggestion: "Switch to a different model or set a Spend Limit in Cursor settings"
    };
  }
  if (clean.includes("not logged in") || clean.includes("auth") || clean.includes("unauthorized")) {
    return {
      type: "auth",
      recoverable: false,
      message: clean,
      userMessage: "Not authenticated with Cursor",
      details: {},
      suggestion: "Run: opencode auth login → Other → cursor-acp, or: cursor-agent login"
    };
  }
  if (clean.includes("ECONNREFUSED") || clean.includes("network") || clean.includes("fetch failed")) {
    return {
      type: "network",
      recoverable: true,
      message: clean,
      userMessage: "Connection to Cursor failed",
      details: {},
      suggestion: "Check your internet connection and try again"
    };
  }
  if (clean.includes("model not found") || clean.includes("invalid model") || clean.includes("Cannot use this model")) {
    const modelMatch = clean.match(/Cannot use this model: ([^.]+)/);
    const availableMatch = clean.match(/Available models: (.+)/);
    const details = {};
    if (modelMatch)
      details.requested = modelMatch[1];
    if (availableMatch)
      details.available = availableMatch[1].split(", ").slice(0, 5).join(", ") + "...";
    return {
      type: "model",
      recoverable: false,
      message: clean,
      userMessage: modelMatch ? `Model '${modelMatch[1]}' not available` : "Requested model not available",
      details,
      suggestion: "Use cursor-acp/auto or check available models with: cursor-agent models"
    };
  }
  const recoverable = clean.includes("timeout") || clean.includes("ETIMEDOUT");
  return {
    type: "unknown",
    recoverable,
    message: clean,
    userMessage: clean.substring(0, 200) || "An error occurred",
    details: {}
  };
}
function formatErrorForUser(error) {
  let output = `cursor-acp error: ${error.userMessage || error.message || "Unknown error"}`;
  const details = error.details || {};
  if (Object.keys(details).length > 0) {
    const detailParts = Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(" | ");
    output += `
  ${detailParts}`;
  }
  if (error.suggestion) {
    output += `
  Suggestion: ${error.suggestion}`;
  }
  return output;
}

// src/cli/model-discovery.ts
import { execFileSync } from "child_process";
function parseCursorModelsOutput(output) {
  const clean = stripAnsi(output);
  const models = [];
  const seen = new Set;
  for (const line of clean.split(`
`)) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    const match = trimmed.match(/^([a-zA-Z0-9._-]+)\s+-\s+(.+?)(?:\s+\((?:current|default)\))*\s*$/);
    if (!match)
      continue;
    const id = match[1];
    if (seen.has(id))
      continue;
    seen.add(id);
    models.push({ id, name: match[2].trim() });
  }
  return models;
}
function discoverModelsFromCursorAgent() {
  const raw = execFileSync("cursor-agent", ["models"], {
    encoding: "utf8",
    killSignal: "SIGTERM",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: MODEL_DISCOVERY_TIMEOUT_MS
  });
  const models = parseCursorModelsOutput(raw);
  if (models.length === 0) {
    throw new Error("No models parsed from cursor-agent output");
  }
  return models;
}
function fallbackModels() {
  return [
    { id: "auto", name: "Auto" },
    { id: "composer-1.5", name: "Composer 1.5" },
    { id: "composer-1", name: "Composer 1" },
    { id: "opus-4.6-thinking", name: "Claude 4.6 Opus (Thinking)" },
    { id: "opus-4.6", name: "Claude 4.6 Opus" },
    { id: "sonnet-4.6", name: "Claude 4.6 Sonnet" },
    { id: "sonnet-4.6-thinking", name: "Claude 4.6 Sonnet (Thinking)" },
    { id: "opus-4.5", name: "Claude 4.5 Opus" },
    { id: "opus-4.5-thinking", name: "Claude 4.5 Opus (Thinking)" },
    { id: "sonnet-4.5", name: "Claude 4.5 Sonnet" },
    { id: "sonnet-4.5-thinking", name: "Claude 4.5 Sonnet (Thinking)" },
    { id: "gpt-5.4-high", name: "GPT-5.4 High" },
    { id: "gpt-5.4-medium", name: "GPT-5.4" },
    { id: "gpt-5.3-codex", name: "GPT-5.3 Codex" },
    { id: "gpt-5.2", name: "GPT-5.2" },
    { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
    { id: "gemini-3-pro", name: "Gemini 3 Pro" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash" },
    { id: "grok", name: "Grok" },
    { id: "kimi-k2.5", name: "Kimi K2.5" }
  ];
}
var MODEL_DISCOVERY_TIMEOUT_MS = 5000;
var init_model_discovery = () => {};

// src/cli/opencode-cursor.ts
init_model_discovery();
import { execFileSync as execFileSync2 } from "child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "fs";
import { homedir } from "os";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

// src/models/variants.ts
var DIRECT_MODEL_IDS = new Set([
  "auto",
  "composer-1.5",
  "kimi-k2.5",
  "gemini-3.1-pro",
  "gemini-3-flash",
  "gpt-5-mini"
]);
var VARIANT_SUFFIXES = [
  "max-thinking-fast",
  "high-thinking-fast",
  "thinking-high-fast",
  "medium-thinking",
  "high-thinking",
  "max-thinking",
  "low-fast",
  "medium-fast",
  "high-fast",
  "xhigh-fast",
  "thinking-low",
  "thinking-medium",
  "thinking-high",
  "thinking-xhigh",
  "thinking-max",
  "extra-high",
  "thinking",
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "fast"
];
var QUALIFIED_VARIANT_PREFIXES = [
  "spark-preview"
];
var DEFAULT_VARIANT_ORDER = [
  null,
  "medium",
  "high",
  "low",
  "none",
  "xhigh",
  "max"
];
var VARIANT_DISPLAY_ORDER = [
  "none",
  "low",
  "low-fast",
  "fast",
  "medium",
  "medium-fast",
  "medium-thinking",
  "high",
  "high-fast",
  "high-thinking",
  "high-thinking-fast",
  "xhigh",
  "xhigh-fast",
  "max",
  "max-thinking",
  "max-thinking-fast",
  "thinking",
  "thinking-low",
  "thinking-medium",
  "thinking-high",
  "thinking-high-fast",
  "thinking-xhigh",
  "thinking-max",
  "extra-high",
  "spark-preview",
  "spark-preview-low",
  "spark-preview-medium",
  "spark-preview-high",
  "spark-preview-xhigh"
];
function parseVariant(modelId, knownModelIds) {
  const qualifiedVariant = parseQualifiedVariant(modelId, knownModelIds);
  if (qualifiedVariant)
    return qualifiedVariant;
  for (const variant of VARIANT_SUFFIXES) {
    const suffix = `-${variant}`;
    if (!modelId.endsWith(suffix))
      continue;
    const baseId = modelId.slice(0, -suffix.length);
    if (isSafeBaseId(baseId)) {
      return resolveQualifiedBaseVariant(baseId, variant, knownModelIds);
    }
  }
  return null;
}
function parseQualifiedVariant(modelId, knownModelIds) {
  for (const qualifier of QUALIFIED_VARIANT_PREFIXES) {
    const suffix = `-${qualifier}`;
    if (!modelId.endsWith(suffix))
      continue;
    const baseId = modelId.slice(0, -suffix.length);
    if (knownModelIds.has(baseId) && isSafeBaseId(baseId)) {
      return { baseId, variant: qualifier };
    }
  }
  return null;
}
function resolveQualifiedBaseVariant(baseId, variant, knownModelIds) {
  for (const qualifier of QUALIFIED_VARIANT_PREFIXES) {
    const suffix = `-${qualifier}`;
    if (!baseId.endsWith(suffix))
      continue;
    const parentBaseId = baseId.slice(0, -suffix.length);
    if (knownModelIds.has(parentBaseId) && isSafeBaseId(parentBaseId)) {
      return {
        baseId: parentBaseId,
        variant: `${qualifier}-${variant}`
      };
    }
  }
  return { baseId, variant };
}
function isSafeBaseId(baseId) {
  const parts = baseId.split("-").filter(Boolean);
  if (parts.length < 2)
    return false;
  if (baseId === "gpt-5")
    return false;
  return true;
}
function getDefaultMember(members) {
  for (const variant of DEFAULT_VARIANT_ORDER) {
    const member = members.find((candidate) => candidate.variant === variant);
    if (member)
      return member;
  }
  return members[0];
}
function formatModelName(modelId) {
  return modelId.split("-").map((part) => {
    if (part === "gpt")
      return "GPT";
    if (part === "xhigh")
      return "XHigh";
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(" ");
}
function compareVariants(a, b) {
  if (a.variant === null)
    return -1;
  if (b.variant === null)
    return 1;
  const aIndex = VARIANT_DISPLAY_ORDER.indexOf(a.variant);
  const bIndex = VARIANT_DISPLAY_ORDER.indexOf(b.variant);
  if (aIndex !== -1 && bIndex !== -1)
    return aIndex - bIndex;
  if (aIndex !== -1)
    return -1;
  if (bIndex !== -1)
    return 1;
  return a.variant.localeCompare(b.variant);
}
function createGroup(baseId, members) {
  const defaultMember = getDefaultMember(members);
  const variants = {};
  for (const member of [...members].sort(compareVariants)) {
    if (member.variant) {
      variants[member.variant] = member.cursorModelId;
    }
  }
  return {
    baseId,
    name: defaultMember.variant === null ? defaultMember.name : formatModelName(baseId),
    defaultCursorModelId: defaultMember.cursorModelId,
    variants,
    members
  };
}
function groupCursorModels(models) {
  const byId = new Map(models.map((model) => [model.id, model]));
  const knownModelIds = new Set(byId.keys());
  const candidates = new Map;
  const direct = [];
  for (const model of models) {
    if (DIRECT_MODEL_IDS.has(model.id)) {
      direct.push(model);
      continue;
    }
    const parsed = parseVariant(model.id, knownModelIds);
    if (!parsed) {
      continue;
    }
    const members = candidates.get(parsed.baseId) || [];
    members.push({
      baseId: parsed.baseId,
      variant: parsed.variant,
      cursorModelId: model.id,
      name: model.name
    });
    candidates.set(parsed.baseId, members);
  }
  for (const model of models) {
    if (DIRECT_MODEL_IDS.has(model.id))
      continue;
    if (!candidates.has(model.id))
      continue;
    candidates.get(model.id)?.push({
      baseId: model.id,
      variant: null,
      cursorModelId: model.id,
      name: model.name
    });
  }
  const groupedIds = new Set;
  const groups = [];
  for (const [baseId, members] of candidates) {
    if (members.length < 2 && !byId.has(baseId))
      continue;
    groups.push(createGroup(baseId, members));
    for (const member of members) {
      groupedIds.add(member.cursorModelId);
    }
  }
  for (const model of models) {
    if (groupedIds.has(model.id))
      continue;
    if (direct.some((candidate) => candidate.id === model.id))
      continue;
    direct.push(model);
  }
  return { groups, direct };
}
function createVariantModelEntries(models) {
  const { groups, direct } = groupCursorModels(models);
  const entries = {};
  const groupedModelIds = new Set;
  for (const group of groups) {
    const variants = {};
    for (const [variant, cursorModel] of Object.entries(group.variants)) {
      variants[variant] = { cursorModel };
    }
    entries[group.baseId] = {
      name: group.name,
      options: {
        cursorModel: group.defaultCursorModelId
      },
      variants
    };
    for (const member of group.members) {
      groupedModelIds.add(member.cursorModelId);
    }
  }
  for (const model of direct) {
    entries[model.id] = { name: model.name };
  }
  return { entries, groupedModelIds };
}
function mergeCursorModelEntries(existingModels, discoveredModels, options) {
  if (!options.variants) {
    return mergeDirectModelEntries(existingModels, discoveredModels);
  }
  const { entries, groupedModelIds } = createVariantModelEntries(discoveredModels);
  const models = { ...existingModels };
  let removedCount = 0;
  if (options.compact) {
    for (const modelId of groupedModelIds) {
      if (!Object.prototype.hasOwnProperty.call(models, modelId))
        continue;
      if (Object.prototype.hasOwnProperty.call(entries, modelId))
        continue;
      delete models[modelId];
      removedCount++;
    }
  }
  for (const [modelId, entry] of Object.entries(entries)) {
    models[modelId] = entry;
  }
  return {
    models,
    syncedCount: Object.keys(entries).length,
    groupedCount: groupedModelIds.size,
    removedCount
  };
}
function mergeDirectModelEntries(existingModels, discoveredModels) {
  const models = { ...existingModels };
  for (const model of discoveredModels) {
    models[model.id] = { name: model.name };
  }
  return {
    models,
    syncedCount: discoveredModels.length,
    groupedCount: 0,
    removedCount: 0
  };
}

// src/cli/opencode-cursor.ts
var BRANDING_HEADER = `
 ▄▄▄  ▄▄▄▄  ▄▄▄▄▄ ▄▄  ▄▄      ▄▄▄  ▄▄ ▄▄ ▄▄▄▄   ▄▄▄▄   ▄▄▄   ▄▄▄▄
██ ██ ██ ██ ██▄▄  ███▄██ ▄▄▄ ██ ▀▀ ██ ██ ██ ██ ██▄▄▄  ██ ██  ██ ██
▀█▄█▀ ██▀▀  ██▄▄▄ ██ ▀██     ▀█▄█▀ ▀█▄█▀ ██▀█▄ ▄▄▄█▀  ▀█▄█▀  ██▀█▄
`;
function getBrandingHeader() {
  return BRANDING_HEADER.trim();
}
function checkBun() {
  try {
    const version = execFileSync2("bun", ["--version"], { encoding: "utf8" }).trim();
    return { name: "bun", passed: true, message: `v${version}` };
  } catch {
    return {
      name: "bun",
      passed: false,
      message: "not found - install with: curl -fsSL https://bun.sh/install | bash"
    };
  }
}
function checkCursorAgent() {
  try {
    const output = execFileSync2("cursor-agent", ["--version"], { encoding: "utf8" }).trim();
    const version = output.split(`
`)[0] || "installed";
    return { name: "cursor-agent", passed: true, message: version };
  } catch {
    return {
      name: "cursor-agent",
      passed: false,
      message: "not found - install with: curl -fsS https://cursor.com/install | bash"
    };
  }
}
function checkCursorAgentLogin() {
  try {
    execFileSync2("cursor-agent", ["models"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 3000
    });
    return { name: "cursor-agent login", passed: true, message: "logged in" };
  } catch {
    return {
      name: "cursor-agent login",
      passed: false,
      message: "not logged in - run: cursor-agent login",
      warning: true
    };
  }
}
function checkOpenCode() {
  try {
    const version = execFileSync2("opencode", ["--version"], { encoding: "utf8" }).trim();
    return { name: "OpenCode", passed: true, message: version };
  } catch {
    return {
      name: "OpenCode",
      passed: false,
      message: "not found - install with: curl -fsSL https://opencode.ai/install | bash"
    };
  }
}
function isNpmDirectInstalled(config) {
  if (!config || typeof config !== "object")
    return false;
  const plugins = config.plugin;
  if (!Array.isArray(plugins))
    return false;
  return plugins.some((p) => typeof p === "string" && p.startsWith(NPM_PACKAGE_PREFIX));
}
function checkPluginFile(pluginPath, config) {
  try {
    if (!existsSync(pluginPath)) {
      if (isNpmDirectInstalled(config)) {
        return {
          name: "Plugin file",
          passed: true,
          message: "Installed via npm package (no symlink needed)"
        };
      }
      return {
        name: "Plugin file",
        passed: false,
        message: "not found - run: open-cursor install"
      };
    }
    const stat = lstatSync(pluginPath);
    if (stat.isSymbolicLink()) {
      const target = readFileSync(pluginPath, "utf8");
      return { name: "Plugin file", passed: true, message: `symlink → ${target}` };
    }
    return { name: "Plugin file", passed: true, message: "file (copy)" };
  } catch {
    return {
      name: "Plugin file",
      passed: false,
      message: "error reading plugin file"
    };
  }
}
function checkProviderConfig(configPath) {
  try {
    if (!existsSync(configPath)) {
      return {
        name: "Provider config",
        passed: false,
        message: "config not found - run: open-cursor install"
      };
    }
    const config = readConfig(configPath);
    const provider = config.provider?.["cursor-acp"];
    if (!provider) {
      return {
        name: "Provider config",
        passed: false,
        message: "cursor-acp provider missing - run: open-cursor install"
      };
    }
    const modelCount = Object.keys(provider.models || {}).length;
    return { name: "Provider config", passed: true, message: `${modelCount} models` };
  } catch {
    return {
      name: "Provider config",
      passed: false,
      message: "error reading config"
    };
  }
}
function checkAiSdk(opencodeDir) {
  try {
    const sdkPath = join(opencodeDir, "node_modules", "@ai-sdk", "openai-compatible");
    if (existsSync(sdkPath)) {
      return { name: "AI SDK", passed: true, message: "@ai-sdk/openai-compatible installed" };
    }
    return {
      name: "AI SDK",
      passed: false,
      message: "not installed - run: open-cursor install"
    };
  } catch {
    return {
      name: "AI SDK",
      passed: false,
      message: "error checking AI SDK"
    };
  }
}
function runDoctorChecks(configPath, pluginPath) {
  const opencodeDir = dirname(configPath);
  let config;
  try {
    config = readConfig(configPath);
  } catch {
    config = undefined;
  }
  return [
    checkBun(),
    checkCursorAgent(),
    checkCursorAgentLogin(),
    checkOpenCode(),
    checkPluginFile(pluginPath, config),
    checkProviderConfig(configPath),
    checkAiSdk(opencodeDir)
  ];
}
var PROVIDER_ID = "cursor-acp";
var NPM_PACKAGE_PREFIX = "@rama_nigg/open-cursor";
var DEFAULT_BASE_URL = "http://127.0.0.1:32124/v1";
function printHelp() {
  const binName = basename(process.argv[1] || "open-cursor");
  console.log(getBrandingHeader());
  console.log(`${binName}

Commands:
  install     Configure OpenCode for Cursor (idempotent, safe to re-run)
  sync-models Refresh model list from cursor-agent
  models      Explain discovered Cursor model groups and variants
  status      Show current configuration state
  doctor      Diagnose common issues
  uninstall   Remove cursor-acp from OpenCode config
  help        Show this help message

Options:
  --config <path>       Path to opencode.json (default: ~/.config/opencode/opencode.json)
  --plugin-dir <path>   Path to plugin directory (default: ~/.config/opencode/plugin)
  --base-url <url>      Proxy base URL (default: http://127.0.0.1:32124/v1)
  --copy                Copy plugin instead of symlink
  --skip-models         Skip model sync during install
  --variants            Generate compact OpenCode model variants from Cursor models
  --compact             With --variants, remove raw grouped Cursor model entries
  --dry-run             Preview sync/install config changes without writing files
  --deep                Run extra doctor checks for models and variant config
  --explain             Show model grouping explanation (models command)
  --no-backup           Don't create config backup
  --json                Output in JSON format where supported
`);
}
function parseArgs(argv) {
  const [commandRaw, ...rest] = argv;
  const command = normalizeCommand(commandRaw);
  const options = {};
  for (let i = 0;i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--copy") {
      options.copy = true;
    } else if (arg === "--skip-models") {
      options.skipModels = true;
    } else if (arg === "--variants") {
      options.variants = true;
    } else if (arg === "--compact") {
      options.compact = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--deep") {
      options.deep = true;
    } else if (arg === "--explain") {
      options.explain = true;
    } else if (arg === "--no-backup") {
      options.noBackup = true;
    } else if (arg === "--config" && rest[i + 1]) {
      options.config = rest[i + 1];
      i += 1;
    } else if (arg === "--plugin-dir" && rest[i + 1]) {
      options.pluginDir = rest[i + 1];
      i += 1;
    } else if (arg === "--base-url" && rest[i + 1]) {
      options.baseUrl = rest[i + 1];
      i += 1;
    } else if (arg === "--json") {
      options.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { command, options };
}
function normalizeCommand(value) {
  switch ((value || "help").toLowerCase()) {
    case "install":
    case "sync-models":
    case "models":
    case "uninstall":
    case "status":
    case "doctor":
    case "help":
      return value ? value.toLowerCase() : "help";
    default:
      throw new Error(`Unknown command: ${value}`);
  }
}
function getConfigHome() {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.length > 0)
    return xdg;
  return join(homedir(), ".config");
}
function resolvePaths(options) {
  const opencodeDir = join(getConfigHome(), "opencode");
  const configPath = resolve(options.config || join(opencodeDir, "opencode.json"));
  const pluginDir = resolve(options.pluginDir || join(opencodeDir, "plugin"));
  const pluginPath = join(pluginDir, `${PROVIDER_ID}.js`);
  return { opencodeDir, configPath, pluginDir, pluginPath };
}
function resolvePluginSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const candidates = [
    join(currentDir, "plugin-entry.js"),
    join(currentDir, "..", "plugin-entry.js")
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("Unable to locate plugin-entry.js next to CLI distribution files");
}
function isErrnoException(error) {
  return typeof error === "object" && error !== null && "code" in error;
}
function readConfig(configPath) {
  if (!existsSync(configPath)) {
    return { plugin: [], provider: {} };
  }
  let raw;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return { plugin: [], provider: {} };
    }
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in config: ${configPath} (${String(error)})`);
  }
}
function writeConfig(configPath, config, noBackup, silent = false) {
  mkdirSync(dirname(configPath), { recursive: true });
  if (!noBackup && existsSync(configPath)) {
    const backupPath = `${configPath}.bak.${new Date().toISOString().replace(/[:]/g, "-")}`;
    copyFileSync(configPath, backupPath);
    if (!silent) {
      console.log(`Backup written: ${backupPath}`);
    }
  }
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}
`, "utf8");
}
function ensureProvider(config, baseUrl) {
  config.plugin = Array.isArray(config.plugin) ? config.plugin : [];
  if (!config.plugin.includes(PROVIDER_ID)) {
    config.plugin.push(PROVIDER_ID);
  }
  config.provider = config.provider && typeof config.provider === "object" ? config.provider : {};
  const current = config.provider[PROVIDER_ID] && typeof config.provider[PROVIDER_ID] === "object" ? config.provider[PROVIDER_ID] : {};
  const options = current.options && typeof current.options === "object" ? current.options : {};
  const models = current.models && typeof current.models === "object" ? current.models : {};
  config.provider[PROVIDER_ID] = {
    ...current,
    name: "Cursor",
    npm: "@ai-sdk/openai-compatible",
    options: {
      ...options,
      baseURL: baseUrl
    },
    models
  };
}
function ensurePluginLink(pluginSource, pluginPath, copyMode) {
  mkdirSync(dirname(pluginPath), { recursive: true });
  rmSync(pluginPath, { force: true });
  if (copyMode) {
    copyFileSync(pluginSource, pluginPath);
    return;
  }
  symlinkSync(pluginSource, pluginPath);
}
function discoverModelsSafe() {
  try {
    return discoverModelsFromCursorAgent();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: cursor-agent models failed; using fallback models (${message})`);
    return fallbackModels();
  }
}
function syncModelsIntoProvider(config, options) {
  if (options.compact && !options.variants) {
    throw new Error("--compact requires --variants");
  }
  const discoveredModels = discoverModelsSafe();
  const provider = config.provider[PROVIDER_ID];
  const existingModels = provider.models && typeof provider.models === "object" ? provider.models : {};
  const beforeModels = snapshotModels(existingModels);
  const result = mergeCursorModelEntries(existingModels, discoveredModels, {
    variants: options.variants === true,
    compact: options.compact === true
  });
  provider.models = result.models;
  return {
    syncedCount: result.syncedCount,
    groupedCount: result.groupedCount,
    removedCount: result.removedCount,
    summary: summarizeModelSync(beforeModels, result.models)
  };
}
function explainCursorModels(models) {
  const grouped = groupCursorModels(models);
  const groupedCount = grouped.groups.reduce((total, group) => total + group.members.length, 0);
  return {
    modelCount: models.length,
    groupedCount,
    directCount: grouped.direct.length,
    groups: grouped.groups.map((group) => ({
      id: group.baseId,
      name: group.name,
      defaultCursorModel: group.defaultCursorModelId,
      memberCount: group.members.length,
      variants: group.variants
    })),
    direct: grouped.direct.map((model) => model.id)
  };
}
function createSyncJsonResult(result, options, configPath) {
  return {
    ...result,
    configPath,
    dryRun: options.dryRun === true,
    variants: options.variants === true,
    compact: options.compact === true
  };
}
function snapshotModels(models) {
  return JSON.parse(JSON.stringify(models));
}
function summarizeModelSync(beforeModels, afterModels) {
  let added = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;
  for (const [modelId, afterEntry] of Object.entries(afterModels)) {
    if (!Object.prototype.hasOwnProperty.call(beforeModels, modelId)) {
      added++;
      continue;
    }
    if (JSON.stringify(beforeModels[modelId]) === JSON.stringify(afterEntry)) {
      skipped++;
    } else {
      updated++;
    }
  }
  for (const modelId of Object.keys(beforeModels)) {
    if (!Object.prototype.hasOwnProperty.call(afterModels, modelId)) {
      removed++;
    }
  }
  return {
    added,
    updated,
    removed,
    priced: countPricedModelEntries(afterModels),
    skipped
  };
}
function countPricedModelEntries(models) {
  let priced = 0;
  for (const entry of Object.values(models)) {
    if (!isRecord(entry))
      continue;
    if (isRecord(entry.cost))
      priced++;
    if (!isRecord(entry.variants))
      continue;
    for (const variantEntry of Object.values(entry.variants)) {
      if (isRecord(variantEntry) && isRecord(variantEntry.cost)) {
        priced++;
      }
    }
  }
  return priced;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function installAiSdk(opencodeDir) {
  try {
    execFileSync2("bun", ["install", "@ai-sdk/openai-compatible"], {
      cwd: opencodeDir,
      stdio: "inherit"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: failed to install @ai-sdk/openai-compatible via bun (${message})`);
  }
}
function commandInstall(options) {
  const { opencodeDir, configPath, pluginPath } = resolvePaths(options);
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const copyMode = options.copy === true;
  const pluginSource = resolvePluginSource();
  if (!options.dryRun) {
    mkdirSync(opencodeDir, { recursive: true });
    ensurePluginLink(pluginSource, pluginPath, copyMode);
  }
  const config = readConfig(configPath);
  ensureProvider(config, baseUrl);
  if (!options.skipModels) {
    const result = syncModelsIntoProvider(config, options);
    printSyncResult(result, options);
  }
  if (options.dryRun) {
    console.log("Dry run: no files changed.");
  } else {
    writeConfig(configPath, config, options.noBackup === true);
    installAiSdk(opencodeDir);
  }
  console.log(`${options.dryRun ? "Would install" : "Installed"} ${PROVIDER_ID}`);
  console.log(`Plugin path: ${pluginPath}${copyMode ? " (copy)" : " (symlink)"}`);
  console.log(`Config path: ${configPath}`);
}
function commandSyncModels(options) {
  const { configPath } = resolvePaths(options);
  const config = readConfig(configPath);
  ensureProvider(config, options.baseUrl || DEFAULT_BASE_URL);
  const result = syncModelsIntoProvider(config, options);
  if (!options.dryRun) {
    writeConfig(configPath, config, options.noBackup === true, options.json === true);
  }
  if (options.json) {
    console.log(JSON.stringify(createSyncJsonResult(result, options, configPath), null, 2));
    return;
  }
  printSyncResult(result, options);
  if (options.dryRun) {
    console.log("Dry run: no changes written.");
  }
  console.log(`Config path: ${configPath}`);
}
function commandModels(options) {
  const models = discoverModelsSafe();
  const explanation = explainCursorModels(models);
  if (options.json) {
    console.log(JSON.stringify(explanation, null, 2));
    return;
  }
  console.log(`Cursor models discovered: ${explanation.modelCount}`);
  console.log(`Grouped Cursor models: ${explanation.groupedCount}`);
  console.log(`Direct models: ${explanation.directCount}`);
  if (!options.explain) {
    return;
  }
  console.log("");
  console.log("Model groups:");
  for (const group of explanation.groups) {
    console.log(`  ${group.id}`);
    console.log(`    Default: ${group.defaultCursorModel}`);
    const variants = Object.entries(group.variants);
    if (variants.length === 0) {
      console.log("    Variants: none");
      continue;
    }
    console.log("    Variants:");
    for (const [variant, cursorModel] of variants) {
      console.log(`      ${variant}: ${cursorModel}`);
    }
  }
  console.log("");
  console.log("Direct models:");
  for (const modelId of explanation.direct) {
    console.log(`  ${modelId}`);
  }
}
function printSyncResult(result, options) {
  console.log(`Models synced: ${result.syncedCount}`);
  if (options.variants) {
    console.log(`Grouped Cursor models: ${result.groupedCount}`);
  }
  if (result.removedCount > 0) {
    console.log(`Raw grouped models removed: ${result.removedCount}`);
  }
  console.log("Sync summary:");
  console.log(`  Added: ${result.summary.added}`);
  console.log(`  Updated: ${result.summary.updated}`);
  console.log(`  Removed: ${result.summary.removed}`);
  console.log(`  Priced: ${result.summary.priced}`);
  console.log(`  Skipped: ${result.summary.skipped}`);
}
var NPM_PACKAGE = "@rama_nigg/open-cursor";
function commandUninstall(options) {
  const { configPath, pluginPath } = resolvePaths(options);
  rmSync(pluginPath, { force: true });
  if (existsSync(configPath)) {
    const config = readConfig(configPath);
    if (Array.isArray(config.plugin)) {
      config.plugin = config.plugin.filter((name) => {
        if (name === PROVIDER_ID)
          return false;
        if (typeof name === "string" && name.startsWith(NPM_PACKAGE))
          return false;
        return true;
      });
    }
    if (config.provider && typeof config.provider === "object") {
      delete config.provider[PROVIDER_ID];
    }
    writeConfig(configPath, config, options.noBackup === true);
  }
  console.log(`Removed plugin link: ${pluginPath}`);
  console.log(`Removed provider "${PROVIDER_ID}" from ${configPath}`);
}
function getStatusResult(configPath, pluginPath) {
  let pluginType = "missing";
  let pluginTarget;
  if (existsSync(pluginPath)) {
    try {
      const stat = lstatSync(pluginPath);
      pluginType = stat.isSymbolicLink() ? "symlink" : "file";
      if (pluginType === "symlink") {
        try {
          pluginTarget = readFileSync(pluginPath, "utf8");
        } catch {
          pluginTarget = undefined;
        }
      }
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "ENOENT") {
        throw error;
      }
      pluginType = "missing";
      pluginTarget = undefined;
    }
  }
  let config;
  let providerEnabled = false;
  let baseUrl = "http://127.0.0.1:32124/v1";
  let modelCount = 0;
  if (existsSync(configPath)) {
    config = readConfig(configPath);
    const provider = config.provider?.["cursor-acp"];
    providerEnabled = !!provider;
    if (provider?.options?.baseURL) {
      baseUrl = provider.options.baseURL;
    }
    modelCount = Object.keys(provider?.models || {}).length;
  } else {
    config = undefined;
  }
  const opencodeDir = dirname(configPath);
  const sdkPath = join(opencodeDir, "node_modules", "@ai-sdk", "openai-compatible");
  const aiSdkInstalled = existsSync(sdkPath);
  let installMethod = "none";
  if (pluginType !== "missing") {
    installMethod = "symlink";
  } else if (isNpmDirectInstalled(config)) {
    installMethod = "npm-direct";
  }
  return {
    installMethod,
    plugin: {
      path: pluginPath,
      type: pluginType,
      target: pluginTarget
    },
    provider: {
      configPath,
      name: "cursor-acp",
      enabled: providerEnabled,
      baseUrl,
      modelCount
    },
    aiSdk: {
      installed: aiSdkInstalled
    }
  };
}
function runDeepDoctorChecks(configPath) {
  const checks = [];
  let config;
  try {
    config = readConfig(configPath);
  } catch (error) {
    return [{
      name: "Deep config read",
      passed: false,
      message: error instanceof Error ? error.message : String(error)
    }];
  }
  const provider = config.provider?.[PROVIDER_ID];
  const models = isRecord(provider?.models) ? provider.models : {};
  const baseUrl = typeof provider?.options?.baseURL === "string" ? provider.options.baseURL : "";
  checks.push({
    name: "Provider base URL",
    passed: baseUrl.startsWith("http://") || baseUrl.startsWith("https://"),
    message: baseUrl || "missing - run: open-cursor install"
  });
  checks.push({
    name: "Provider models",
    passed: Object.keys(models).length > 0,
    message: `${Object.keys(models).length} configured model(s)`
  });
  const variantEntryCount = countVariantModelEntries(models);
  checks.push({
    name: "Compact variants",
    passed: variantEntryCount > 0,
    warning: variantEntryCount === 0,
    message: variantEntryCount > 0 ? `${variantEntryCount} model entr${variantEntryCount === 1 ? "y" : "ies"} with variants` : "no compact variants found - run: open-cursor sync-models --variants --compact"
  });
  let discoveredModels;
  try {
    discoveredModels = discoverModelsFromCursorAgent();
    checks.push({
      name: "Cursor model discovery",
      passed: true,
      message: `${discoveredModels.length} model(s) from cursor-agent`
    });
  } catch (error) {
    checks.push({
      name: "Cursor model discovery",
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      warning: true
    });
    return checks;
  }
  const knownModelIds = new Set(discoveredModels.map((model) => model.id));
  const unknownTargets = collectConfiguredCursorModels(models).filter((modelId) => !knownModelIds.has(modelId));
  checks.push({
    name: "Configured Cursor model targets",
    passed: unknownTargets.length === 0,
    warning: unknownTargets.length > 0,
    message: unknownTargets.length === 0 ? "all configured targets exist in cursor-agent models" : `${unknownTargets.length} target(s) not found: ${unknownTargets.slice(0, 5).join(", ")}`
  });
  return checks;
}
function countVariantModelEntries(models) {
  return Object.values(models).filter((entry) => {
    return isRecord(entry) && isRecord(entry.variants) && Object.keys(entry.variants).length > 0;
  }).length;
}
function collectConfiguredCursorModels(models) {
  const targets = [];
  for (const [modelId, entry] of Object.entries(models)) {
    if (!isRecord(entry)) {
      targets.push(modelId);
      continue;
    }
    const optionTarget = readCursorModel(entry.options);
    targets.push(optionTarget || modelId);
    if (!isRecord(entry.variants))
      continue;
    for (const variantEntry of Object.values(entry.variants)) {
      const variantTarget = readCursorModel(variantEntry);
      if (variantTarget)
        targets.push(variantTarget);
    }
  }
  return [...new Set(targets)];
}
function readCursorModel(value) {
  if (!isRecord(value))
    return;
  const cursorModel = value.cursorModel;
  return typeof cursorModel === "string" && cursorModel.trim().length > 0 ? cursorModel.trim() : undefined;
}
function commandStatus(options) {
  const { configPath, pluginPath } = resolvePaths(options);
  const result = getStatusResult(configPath, pluginPath);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log("");
  console.log("Plugin");
  console.log(`  Path: ${result.plugin.path}`);
  if (result.plugin.type === "symlink" && result.plugin.target) {
    console.log(`  Type: symlink → ${result.plugin.target}`);
  } else if (result.plugin.type === "file") {
    console.log(`  Type: file (copy)`);
  } else {
    console.log(`  Type: missing`);
  }
  console.log(`  Install method: ${result.installMethod}`);
  console.log("");
  console.log("Provider");
  console.log(`  Config: ${result.provider.configPath}`);
  console.log(`  Name: ${result.provider.name}`);
  console.log(`  Enabled: ${result.provider.enabled ? "yes" : "no"}`);
  console.log(`  Base URL: ${result.provider.baseUrl}`);
  console.log(`  Models: ${result.provider.modelCount}`);
  console.log("");
  console.log("AI SDK");
  console.log(`  @ai-sdk/openai-compatible: ${result.aiSdk.installed ? "installed" : "not installed"}`);
}
function commandDoctor(options) {
  const { configPath, pluginPath } = resolvePaths(options);
  const checks = [
    ...runDoctorChecks(configPath, pluginPath),
    ...options.deep ? runDeepDoctorChecks(configPath) : []
  ];
  if (options.json) {
    const failed2 = checks.filter((c) => !c.passed && !c.warning);
    console.log(JSON.stringify({ deep: options.deep === true, checks, failed: failed2.length }, null, 2));
    return;
  }
  console.log("");
  for (const check of checks) {
    const symbol = check.passed ? "✓" : check.warning ? "⚠" : "✗";
    const color = check.passed ? "\x1B[32m" : check.warning ? "\x1B[33m" : "\x1B[31m";
    console.log(` ${color}${symbol}\x1B[0m ${check.name}: ${check.message}`);
  }
  const failed = checks.filter((c) => !c.passed && !c.warning);
  console.log("");
  if (failed.length === 0) {
    console.log("All checks passed!");
  } else {
    console.log(`${failed.length} check(s) failed. See messages above.`);
  }
}
function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    printHelp();
    process.exit(1);
    return;
  }
  try {
    switch (parsed.command) {
      case "install":
        commandInstall(parsed.options);
        return;
      case "sync-models":
        commandSyncModels(parsed.options);
        return;
      case "models":
        commandModels(parsed.options);
        return;
      case "uninstall":
        commandUninstall(parsed.options);
        return;
      case "status":
        commandStatus(parsed.options);
        return;
      case "doctor":
        commandDoctor(parsed.options);
        return;
      case "help":
        printHelp();
        return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) {
  main();
}
export {
  summarizeModelSync,
  runDoctorChecks,
  runDeepDoctorChecks,
  getStatusResult,
  getBrandingHeader,
  explainCursorModels,
  checkCursorAgentLogin,
  checkCursorAgent,
  checkBun
};
