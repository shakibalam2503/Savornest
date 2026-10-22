const pino = require("pino");
const env = require("./env");

const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
  base: {
    service: "user-service",
  },
});

module.exports = logger;