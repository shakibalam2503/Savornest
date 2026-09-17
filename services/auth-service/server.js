const app = require("./src/app");
const config = require("./src/config/env");
const logger = require("./src/config/logger");
const { connectDatabase } = require("./src/config/database");

const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(config.port, () => {
      logger.info(
        {
          port: config.port,
          environment: config.nodeEnv,
        },
        "Auth Service started"
      );
    });

    return server;
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