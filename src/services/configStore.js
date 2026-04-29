const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_CONFIG_PATH = path.join(__dirname, "..", "..", "config", "default-config.json");

function readJson(filePath) {
  const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(content);
}

function mergeDeep(base, override) {
  const output = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = mergeDeep(base[key] || {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeConfig(config) {
  return {
    ...config,
    location: {
      ...config.location,
      city: String(config.location?.city || "Tokyo").trim(),
      country: String(config.location?.country || "Japan").trim(),
      latitude: normalizeNumber(config.location?.latitude),
      longitude: normalizeNumber(config.location?.longitude),
      timezone: String(config.location?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
      source: String(config.location?.source || "manual")
    },
    prayer: {
      ...config.prayer,
      calculationMethod: config.prayer?.calculationMethod || "MuslimWorldLeague",
      madhab: config.prayer?.madhab || "Shafi",
      useApiFirst: config.prayer?.useApiFirst !== false,
      apiTimeoutMs: Number(config.prayer?.apiTimeoutMs || 8000)
    },
    app: {
      ...config.app,
      refreshMinutes: Number(config.app?.refreshMinutes || 30),
      logLevel: config.app?.logLevel || "info",
      autoDetectOnFirstRun: config.app?.autoDetectOnFirstRun !== false
    }
  };
}

function createConfigStore(userDataPath, logger) {
  const configPath = path.join(userDataPath, "config.json");
  const defaults = normalizeConfig(readJson(DEFAULT_CONFIG_PATH));

  function load() {
    try {
      if (!fs.existsSync(configPath)) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), "utf8");
        return defaults;
      }
      return normalizeConfig(mergeDeep(defaults, readJson(configPath)));
    } catch (error) {
      logger.error("Failed to load config; using defaults", error);
      return defaults;
    }
  }

  function save(nextConfig) {
    const normalized = normalizeConfig(mergeDeep(defaults, nextConfig));
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(normalized, null, 2), "utf8");
    logger.info("Config saved", { city: normalized.location.city, country: normalized.location.country });
    return normalized;
  }

  return { configPath, defaults, load, save };
}

module.exports = { createConfigStore };

