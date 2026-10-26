
const env = require("./src/config/env");
const app = require("./src/app");
const { pool, connectDatabase } = require("./src/config/database");
const {
  startUserRegisteredConsumer,
} = require("./src/consumers/user-registered.consumer");
const { closeRabbitMQ } = require("./src/config/rabbitmq");
const logger = require("./src/config/logger");

let server;
let shuttingDown = false;

async function startServer() {
  try {
    await connectDatabase();
    await startUserRegisteredConsumer();

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

    try {
      await closeRabbitMQ();
    } catch (closeError) {
      logger.error({ err: closeError }, "Error closing RabbitMQ after startup failure");
    }

    await pool.end();
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutting down User Service");

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    await closeRabbitMQ();
    await pool.end();

    logger.info("User Service shut down successfully");
    process.exitCode = 0;
  } catch (err) {
    logger.error({ err }, "Error during User Service shutdown");
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startServer();
