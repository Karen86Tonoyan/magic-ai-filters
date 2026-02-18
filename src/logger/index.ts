// ============================================================
// CLAW BOT — Logger (Winston)
// ============================================================

import winston from "winston";
import path from "path";
import fs from "fs";

const LOG_DIR = process.env.LOG_DIR ?? "./logs";
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";

// Upewnij się, że katalog logów istnieje
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${ts}] ${level}: ${stack ?? message}${metaStr}`;
  })
);

const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// Osobny logger do audytu bezpieczeństwa
export const auditLogger = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, "audit.log"),
      format: fileFormat,
      maxsize: 50 * 1024 * 1024,
      maxFiles: 30,
    }),
  ],
});

export default logger;
