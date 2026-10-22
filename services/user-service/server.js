const env = require("./src/config/env");
const app = require("./src/app");
const { pool, connectDatabase } = require("./src/config/database");
const logger = require("./src/config/logger");

let server;

async function startServer() {
  try {
    await connectDatabase();

    server = app.listen(env.port, () => {
      logger.info(
        {
          port: env.port,
          environment: env.nodeEnv,
        },
        "User Service started"
      );
    });
  } catch (err) {
    logger.fatal({ err }, "Failed to start User Service");
    await pool.end();
    process.exitCode = 1;
  }
}

async function shutdown() {
  logger.info("Shutting down User Service");

  if (!server) {
    await pool.end();
    return;
  }

  server.close(async () => {
    await pool.end();
    logger.info("User Service shut down");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();