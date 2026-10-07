const app = require("./src/app");
const config = require("./src/config/env");
const logger = require("./src/config/logger");
const { connectDatabase } = require("./src/config/database");
const {checkRedis} = require("./src/config/redis")
const startServer = async () => {
  try {
    await connectDatabase();
    await checkRedis();

    logger.info("Redis Connected Successfully");

    app.listen(config.port, "localhost", () => {
      logger.info(
        {
          port: config.port,
          environment: config.nodeEnv,
        },
        "Auth Service started"
      );
    });

  } catch (error) {
    logger.fatal(
      {
        err: error,
      },
      "Auth Service failed to start"
    );

    process.exit(1);
  }
};

startServer();