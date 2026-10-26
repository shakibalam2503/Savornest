
const amqp = require("amqplib");
const fs = require("fs");
const path = require("path");

const env = require("../src/config/env");
const logger = require("../src/config/logger");

const DLQ_QUEUE = "user-service.user-registered.dlq";
const MAIN_EXCHANGE = "savornest.events";
const ROUTING_KEY = "UserRegistered";

const replayEventPath = path.join(__dirname, "replay-event.json");

async function replayOneMessage() {
  if (!env.rabbitmqUrl) {
    throw new Error("RABBITMQ_URL is not configured");
  }

  const correctedEvent = JSON.parse(
    fs.readFileSync(replayEventPath, "utf8"),
  );

  if (
    correctedEvent.eventType !== "UserRegistered" ||
    !correctedEvent.eventId ||
    !correctedEvent.payload?.userId
  ) {
    throw new Error("Invalid corrected UserRegistered event");
  }

  const connection = await amqp.connect(env.rabbitmqUrl);
  let channel;
  let message;

  try {
    channel = await connection.createConfirmChannel();

    message = await channel.get(DLQ_QUEUE, { noAck: false });

    if (!message) {
      logger.info("DLQ is empty; nothing to replay");
      return;
    }

    const originalEvent = JSON.parse(message.content.toString());

    // Prevent accidentally replacing a different DLQ event.
    if (originalEvent.eventId !== correctedEvent.eventId) {
      throw new Error(
        `Event ID mismatch. DLQ has ${originalEvent.eventId}, ` +
        `but replay-event.json has ${correctedEvent.eventId}`,
      );
    }

    const headers = { ...message.properties.headers };

    for (const key of Object.keys(headers)) {
      if (
        key === "x-death" ||
        key.startsWith("x-first-death-") ||
        key.startsWith("x-last-death-") ||
        key === "x-dlq-reason" ||
        key === "x-retry-count"
      ) {
        delete headers[key];
      }
    }

    await new Promise((resolve, reject) => {
      channel.publish(
        MAIN_EXCHANGE,
        ROUTING_KEY,
        Buffer.from(JSON.stringify(correctedEvent)),
        {
          persistent: true,
          contentType: "application/json",
          messageId: message.properties.messageId,
          correlationId: message.properties.correlationId,
          headers,
        },
        (error) => {
          if (error) reject(error);
          else resolve();
        },
      );
    });

    // Remove the original DLQ message only after publish confirmation.
    channel.ack(message);

    logger.info(
      { eventId: correctedEvent.eventId },
      "Corrected DLQ event replayed successfully",
    );
  } catch (error) {
    // If replay fails, preserve the original DLQ message.
    if (channel && message) {
      channel.nack(message, false, true);
    }

    throw error;
  } finally {
    if (channel) await channel.close().catch(() => {});
    await connection.close().catch(() => {});
  }
}

replayOneMessage().catch((error) => {
  logger.error({ err: error }, "DLQ replay failed");
  process.exitCode = 1;
});
