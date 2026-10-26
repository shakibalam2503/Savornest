const {
  getRabbitMQChannel,
  DLQ_EXCHANGE,
  DLQ_ROUTING_KEY,
} = require("../config/rabbitmq");

async function publishToDLQ(message, reason, retryCount = 0) {
  const channel = getRabbitMQChannel();

  if (!channel) {
    throw new Error("RabbitMQ channel is not available");
  }

  await new Promise((resolve, reject) => {
    channel.publish(
      DLQ_EXCHANGE,
      DLQ_ROUTING_KEY,
      message.content,
      {
        persistent: true,
        contentType: message.properties.contentType,
        contentEncoding: message.properties.contentEncoding,
        correlationId: message.properties.correlationId,
        messageId: message.properties.messageId,
        headers: {
          ...message.properties.headers,
          "x-dlq-reason": reason,
          "x-retry-count": retryCount,
        },
      },
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

module.exports = { publishToDLQ };