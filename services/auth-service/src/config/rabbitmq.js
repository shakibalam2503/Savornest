
const amqp = require("amqplib");
const config = require("./env");
const logger = require("./logger");

let connection;
let channel;

const EXCHANGE_NAME = "savornest.events";

async function connectRabbitMQ() {
  if (channel) {
    return channel;
  }

  if (!config.rabbitmqUrl) {
    throw new Error("RABBITMQ_URL is not configured");
  }

  connection = await amqp.connect(config.rabbitmqUrl);
  channel = await connection.createConfirmChannel();

  await channel.assertExchange(EXCHANGE_NAME, "topic", {
    durable: true,
  });

  connection.on("error", (error) => {
    logger.error({ err: error }, "RabbitMQ connection error");
  });

  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    connection = null;
    channel = null;
  });

  logger.info("RabbitMQ connected successfully");

  return channel;
}

function getRabbitMQChannel() {
  return channel;
}

async function closeRabbitMQ() {
  const currentChannel = channel;
  const currentConnection = connection;

  channel = null;
  connection = null;

  if (currentChannel) {
    await currentChannel.close();
  }

  if (currentConnection) {
    await currentConnection.close();
  }
}

module.exports = {
  connectRabbitMQ,
  getRabbitMQChannel,
  closeRabbitMQ,
  EXCHANGE_NAME,
};
