
const {
  connectRabbitMQ,
  getRabbitMQChannel,
  EXCHANGE_NAME,
} = require("../config/rabbitmq");

const {
  getPendingOutboxEvents,
  markOutboxEventPublished,
  recordOutboxPublishFailure,
} = require("../repositories/outbox.repository");

const logger = require("../config/logger");

function publishWithConfirmation(channel, exchange, routingKey, message) {
  return new Promise((resolve, reject) => {
    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
      (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
}

async function publishPendingEvents(limit = 100) {
  await connectRabbitMQ();

  const channel = getRabbitMQChannel();

  if (!channel) {
    throw new Error("RabbitMQ channel is not available");
  }

  const events = await getPendingOutboxEvents(limit);

  for (const event of events) {
    try {
      const payload =
        typeof event.payload === "string"
          ? JSON.parse(event.payload)
          : event.payload;

      const message = {
        eventId: event.id,
        eventType: event.event_type,
        occurredAt: event.created_at,
        aggregateType: event.aggregate_type,
        aggregateId: event.aggregate_id,
        payload,
      };

      const routingKey = event.event_type;

      await publishWithConfirmation(
        channel,
        EXCHANGE_NAME,
        routingKey,
        message
      );

      await markOutboxEventPublished(event.id);

      logger.info(
        {
          eventId: event.id,
          eventType: event.event_type,
        },
        "Outbox event published"
      );
    } catch (error) {
      try {
        await recordOutboxPublishFailure(
          event.id,
          error.message || "Unknown publishing error"
        );
      } catch (recordError) {
        logger.error(
          { err: recordError, eventId: event.id },
          "Failed to record outbox publishing failure"
        );
      }

      logger.error(
        { err: error, eventId: event.id },
        "Failed to publish outbox event"
      );
    }
  }

  return {
    processed: events.length,
  };
}

module.exports = {
  publishPendingEvents,
};
