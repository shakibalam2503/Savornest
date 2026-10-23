
const { publishPendingEvents } = require("./outbox-publisher.service");
const logger = require("../config/logger");

let intervalId = null;
let running = false;

async function runPublisher() {
  if (running) {
    return;
  }

  running = true;

  try {
    await publishPendingEvents();
  } catch (error) {
    logger.error(
      { err: error },
      "Outbox publisher cycle failed"
    );
  } finally {
    running = false;
  }
}

function startOutboxPublisher(intervalMs = 5000) {
  if (intervalId) {
    return;
  }

  // Process existing events immediately on startup.
  void runPublisher();

  intervalId = setInterval(() => {
    void runPublisher();
  }, intervalMs);

  logger.info(
    { intervalMs },
    "Outbox publisher worker started"
  );
}

function stopOutboxPublisher() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startOutboxPublisher,
  stopOutboxPublisher,
};
