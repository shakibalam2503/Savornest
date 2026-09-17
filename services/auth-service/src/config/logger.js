const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",

  base: {
    service: "auth-service",
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "accessToken",
      "refreshToken",
    ],
    censor: "[REDACTED]",
  },
});

module.exports = logger;