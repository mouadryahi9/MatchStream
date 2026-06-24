import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.resolve(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const logFile = path.join(logDir, "app.log");
const errorLogFile = path.join(logDir, "error.log");

function formatMessage(level, source, message, metadata = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    ...metadata,
  });
}

function writeToFile(file, line) {
  try {
    fs.appendFileSync(file, line + "\n");
  } catch {
  }
}

export const logger = {
  debug(source, message, metadata) {
    if (levels[config.env] > levels.debug) return;
    const line = formatMessage("debug", source, message, metadata);
    writeToFile(logFile, line);
  },

  info(source, message, metadata) {
    const line = formatMessage("info", source, message, metadata);
    writeToFile(logFile, line);
    console.log(`[INFO] [${source}] ${message}`);
  },

  warn(source, message, metadata) {
    const line = formatMessage("warn", source, message, metadata);
    writeToFile(logFile, line);
    writeToFile(errorLogFile, line);
    console.warn(`[WARN] [${source}] ${message}`);
  },

  error(source, message, metadata) {
    const line = formatMessage("error", source, message, metadata);
    writeToFile(logFile, line);
    writeToFile(errorLogFile, line);
    console.error(`[ERROR] [${source}] ${message}`);
  },
};
