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

// src/cli/discover.ts
init_model_discovery();
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
async function main() {
  console.log("Discovering Cursor models...");
  let models = fallbackModels();
  try {
    models = discoverModelsFromCursorAgent();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: cursor-agent model discovery failed, using fallback list (${message})`);
  }
  console.log(`Found ${models.length} models:`);
  for (const model of models) {
    console.log(`  - ${model.id}: ${model.name}`);
  }
  const configPath = join(homedir(), ".config/opencode/opencode.json");
  if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    process.exit(1);
  }
  const existingConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  if (existingConfig.provider?.["cursor-acp"]) {
    const formatted = Object.fromEntries(models.map((model) => [model.id, { name: model.name }]));
    existingConfig.provider["cursor-acp"].models = {
      ...existingConfig.provider["cursor-acp"].models,
      ...formatted
    };
    writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
    console.log(`Updated ${configPath}`);
  } else {
    console.error("cursor-acp provider not found in config");
    process.exit(1);
  }
  console.log("Done!");
}
main().catch(console.error);
