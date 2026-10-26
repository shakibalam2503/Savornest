const {
  connectRabbitMQ,
  getRabbitMQChannel,
  QUEUE_NAME,
} = require("../config/rabbitmq");
const { publishToDLQ } = require("../utils/rabbitmq-publisher");
const {
  registerUserProfile,
} = require("../services/user-registration.service");

const logger = require("../config/logger");

const MAX_RETRIES = 3;
const RETRY_QUEUE = "user-service.user-registered.retry";

function getRetryCount(message) {
  const deaths = message.properties.headers?.["x-death"] || [];

  const retryQueueDeath = deaths.find(
    (death) => death.queue === RETRY_QUEUE && death.reason === "expired",
  );

  return retryQueueDeath?.count || 0;
}

async function startUserRegisteredConsumer() {
  await connectRabbitMQ();

  const channel = getRabbitMQChannel();
  await channel.prefetch(1);

  await channel.consume(
    QUEUE_NAME,
    async (message) => {
      if (!message) return;

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

          // Malformed messages should not be retried forever.
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
          { err: error, retryCount, eventId: message.properties.messageId },
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

        // Main queue dead-letter configuration routes this to retry queue.
        channel.nack(message, false, false);
      }
    },
    { noAck: false },
  );

  logger.info("UserRegistered consumer started");
}

module.exports = {
  startUserRegisteredConsumer,
};
