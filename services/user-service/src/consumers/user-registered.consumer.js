
const {
  connectRabbitMQ,
  getRabbitMQChannel,
  QUEUE_NAME,
} = require("../config/rabbitmq");

const { registerUserProfile } = require("../services/user-registration.service");
const logger = require("../config/logger");

async function startUserRegisteredConsumer() {
  await connectRabbitMQ();

  const channel = getRabbitMQChannel();

  // Process one message at a time initially.
  await channel.prefetch(1);

  await channel.consume(
    QUEUE_NAME,
    async (message) => {
      if (!message) return;

      try {
        const event = JSON.parse(message.content.toString());

        if (event.eventType !== "UserRegistered") {
          logger.warn(
            { eventType: event.eventType },
            "Unexpected event received"
          );

          channel.nack(message, false, false);
          return;
        }

        await registerUserProfile({
          userId: event.payload.userId,
          fullName: event.payload.fullName,
          phone: event.payload.phone,
          avatarUrl: event.payload.avatarUrl,
          role: event.payload.role || "CUSTOMER",
        });

        channel.ack(message);

        logger.info(
          { eventId: event.eventId, userId: event.payload.userId },
          "UserRegistered event processed"
        );
      } catch (error) {
        logger.error(
          { err: error },
          "Failed to process UserRegistered event"
        );

        // Requeue for another attempt.
        channel.nack(message, false, true);
      }
    },
    { noAck: false }
  );

  logger.info("UserRegistered consumer started");
}

module.exports = { startUserRegisteredConsumer };
