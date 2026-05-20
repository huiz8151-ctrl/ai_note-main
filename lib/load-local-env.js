const fs = require("node:fs");
const path = require("node:path");

function stripWrappingQuotes(value) {
  const normalized = String(value || "").trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    return normalized.slice(1, -1);
  }

  return normalized;
}

function decodeEnvValue(rawValue) {
  return stripWrappingQuotes(rawValue)
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t");
}

function parseEnvFile(content) {
  const result = {};
  const lines = String(content || "").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    const value = normalized.slice(separatorIndex + 1);
    result[key] = decodeEnvValue(value);
  }

  return result;
}

function loadLocalEnv({ root }) {
  const resolvedRoot = path.resolve(String(root || process.cwd()));
  const candidates = [".env.local", ".env"].map((name) => path.join(resolvedRoot, name));
  const loadedFrom = [];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    const parsed = parseEnvFile(fs.readFileSync(candidate, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    loadedFrom.push(candidate);
  }

  return {
    loadedFrom
  };
}

module.exports = {
  loadLocalEnv
};
