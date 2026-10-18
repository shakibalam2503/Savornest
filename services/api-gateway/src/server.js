const app = require("./app");
const config = require("./config/env");

const server = app.listen(config.port, () => {
  console.log(
    `API Gateway running on port ${config.port}`
  );
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down API Gateway...`);

  server.close((err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exitCode = 1;
      return;
    }

    process.exitCode = 0;
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));