
const app = require("./src/app");
const config = require("./src/config/env");
const logger = require("./src/config/logger");
const { connectDatabase, pool } = require("./src/config/database");
const { checkRedis } = require("./src/config/redis");

const {
  startOutboxPublisher,
  stopOutboxPublisher,
} = require("./src/services/outbox-publisher.worker");

const {
  closeRabbitMQ,
} = require("./src/config/rabbitmq");

let server;
let shuttingDown = false;

const startServer = async () => {
  try {
    await connectDatabase();
    await checkRedis();

    logger.info("Redis Connected Successfully");

    server = app.listen(config.port, "localhost", () => {
      logger.info(
        {
          port: config.port,
          environment: config.nodeEnv,
        },
        "Auth Service started"
      );

      startOutboxPublisher();
    });
  } catch (error) {
    logger.fatal(
      { err: error },
      "Auth Service failed to start"
    );

    await pool.end().catch(() => {});
    process.exit(1);
  }
};

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, "Auth Service shutting down");

  stopOutboxPublisher();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await closeRabbitMQ();
    await pool.end();

    logger.info("Auth Service shut down successfully");
    process.exit(0);
  } catch (error) {
    logger.error(
      { err: error },
      "Error during Auth Service shutdown"
    );

    process.exit(1);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startServer();
