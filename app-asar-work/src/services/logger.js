const fs = require("node:fs");
const path = require("node:path");

const LEVELS = ["debug", "info", "warn", "error"];

function serialize(value) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function createLogger({ appName, userDataPath, level = "info" }) {
  const logDir = path.join(userDataPath, "logs");
  const logFile = path.join(logDir, `${appName}.log`);
  fs.mkdirSync(logDir, { recursive: true });

  const minLevel = LEVELS.includes(level) ? level : "info";
  const minIndex = LEVELS.indexOf(minLevel);

  function write(entryLevel, message, meta) {
    if (LEVELS.indexOf(entryLevel) < minIndex) {
      return;
    }

    const line = JSON.stringify({
      time: new Date().toISOString(),
      level: entryLevel,
      message,
      meta: meta === undefined ? undefined : serialize(meta)
    });

    fs.appendFileSync(logFile, `${line}\n`, "utf8");
    if (entryLevel === "error") {
      console.error(message, meta || "");
    } else {
      console.log(message, meta || "");
    }
  }

  return {
    logFile,
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta)
  };
}

module.exports = { createLogger };
