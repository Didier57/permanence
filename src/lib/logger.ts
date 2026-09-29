import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "smtpPassword",
      "*.smtpPassword",
      "smtpPasswordEncrypted",
      "*.smtpPasswordEncrypted",
      "token",
      "*.token",
      "tokenHash",
      "*.tokenHash",
      "req.headers.cookie",
      "headers.cookie",
      "APP_SECRET",
    ],
    censor: "[redacted]",
  },
});
