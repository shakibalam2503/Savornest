const {
  connectRabbitMQ,
  getRabbitMQChannel,
  setRabbitMQRecoveryHandler,
  QUEUE_NAME,
} = require("../config/rabbitmq");

const { publishToDLQ } = require("../utils/rabbitmq-publisher");
const {
  registerUserProfile,
} = require("../services/user-registration.service");

const logger = require("../config/logger");

const MAX_RETRIES = 3;
const RETRY_QUEUE = "user-service.user-registered.retry";

let consumerTag = null;
let shuttingDown = false;
const activeHandlers = new Set();
let startPromise = null;
function getRetryCount(message) {
  const deaths = message.properties.headers?.["x-death"] || [];

  const retryQueueDeath = deaths.find(
    (death) => death.queue === RETRY_QUEUE && death.reason === "expired",
  );

  return retryQueueDeath?.count || 0;
}

async function processMessage(message, channel) {
  try {
    const event = JSON.parse(message.content.toString());

    if (
      event.eventType !== "UserRegistered" ||
      !event.eventId ||
      !event.payload?.userId
    ) {
      logger.warn(
        { eventType: event.eventType, eventId: event.eventId },
        "Invalid UserRegistered event",
      );

      await publishToDLQ(message, "invalid-event");
      channel.ack(message);

      logger.warn({ eventId: event.eventId }, "Invalid event moved to DLQ");
      return;
    }

    const result = await registerUserProfile({
      eventId: event.eventId,
      eventType: event.eventType,
      userId: event.payload.userId,
      fullName: event.payload.fullName,
      phone: event.payload.phone,
      avatarUrl: event.payload.avatarUrl,
      role: event.payload.role || "CUSTOMER",
    });

    if (result.duplicate) {
      logger.info({ eventId: event.eventId }, "Duplicate event skipped");
    } else {
      logger.info(
        { eventId: event.eventId, userId: event.payload.userId },
        "UserRegistered event processed",
      );
    }

    channel.ack(message);
  } catch (error) {
    const retryCount = getRetryCount(message);

    logger.error(
      {
        err: error,
        retryCount,
        eventId: message.properties.messageId,
      },
      "Failed to process UserRegistered event",
    );

    if (retryCount >= MAX_RETRIES) {
      await publishToDLQ(message, "retry-limit-exceeded", retryCount);

      channel.ack(message);

      logger.error(
        { retryCount },
        "Message moved to dead-letter queue after retry limit",
      );

      return;
    }

    // Broker routes the rejected message to the retry queue.
    channel.nack(message, false, false);
  }
}



async function startUserRegisteredConsumer() {
  if (shuttingDown) {
    throw new Error("Cannot start consumer during shutdown");
  }

  if (consumerTag) return;
  if (startPromise) return startPromise;

  startPromise = (async () => {
    await connectRabbitMQ();

    // Check shutdown again after awaiting the connection.
    if (shuttingDown) {
      throw new Error("Consumer startup cancelled during shutdown");
    }

    const channel = getRabbitMQChannel();

    if (!channel) {
      throw new Error("RabbitMQ channel is unavailable");
    }

    await channel.prefetch(1);

    const result = await channel.consume(
      QUEUE_NAME,
      (message) => {
        if (!message) return;

        const task = processMessage(message, channel);
        activeHandlers.add(task);

        task.then(
          () => activeHandlers.delete(task),
          (error) => {
            activeHandlers.delete(task);
            logger.error(
              { err: error },
              "Unexpected consumer handler failure",
            );
          },
        );
      },
      { noAck: false },
    );

    consumerTag = result.consumerTag;

    logger.info("UserRegistered consumer started");
  })();

  try {
    await startPromise;
  } finally {
    startPromise = null;
  }
}



async function stopUserRegisteredConsumer() {
  if (shuttingDown) return;
  shuttingDown = true;

  const channel = getRabbitMQChannel();

  // Stop RabbitMQ from delivering new messages to this consumer.
  if (channel && consumerTag) {
    await channel.cancel(consumerTag);
    consumerTag = null;
  }

  // Wait for all message handlers already in progress.
  while (activeHandlers.size > 0) {
    await Promise.allSettled([...activeHandlers]);
  }

  logger.info("UserRegistered consumer stopped; active handlers completed");
}
setRabbitMQRecoveryHandler(async () => {
  if (shuttingDown) return;

  // A new RabbitMQ connection has been established.
  // Register the consumer on its new channel.
  consumerTag = null;

  await startUserRegisteredConsumer();
});
module.exports = {
  startUserRegisteredConsumer,
  stopUserRegisteredConsumer,
};
