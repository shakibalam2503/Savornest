
const {
  connectRabbitMQ,
  getRabbitMQChannel,
  QUEUE_NAME,
} = require("../config/rabbitmq");

const {
  registerUserProfile,
} = require("../services/user-registration.service");

const logger = require("../config/logger");

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
            "Invalid UserRegistered event"
          );

          channel.nack(message, false, false);
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
          logger.info(
            { eventId: event.eventId },
            "Duplicate event skipped"
          );
        } else {
          logger.info(
            { eventId: event.eventId, userId: event.payload.userId },
            "UserRegistered event processed"
          );
        }

        // Acknowledge both newly processed and duplicate events.
        channel.ack(message);
      } catch (error) {
        logger.error(
          { err: error },
          "Failed to process UserRegistered event"
        );

        channel.nack(message, false, true);
      }
    },
    { noAck: false }
  );

  logger.info("UserRegistered consumer started");
}

module.exports = {
  startUserRegisteredConsumer,
};
