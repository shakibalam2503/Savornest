
const amqp = require("amqplib");
const env = require("./env");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "savornest.events";
const QUEUE_NAME = "user-service.user-registered";
const ROUTING_KEY = "UserRegistered";

async function connectRabbitMQ() {
  if (channel) return channel;

  if (!env.rabbitmqUrl) {
    throw new Error("RABBITMQ_URL is not configured");
  }

  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE_NAME, "topic", {
    durable: true,
  });

  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
  });

  await channel.bindQueue(
    QUEUE_NAME,
    EXCHANGE_NAME,
    ROUTING_KEY
  );

  connection.on("error", (error) => {
    logger.error({ err: error }, "RabbitMQ connection error");
  });

  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    connection = null;
    channel = null;
  });

  logger.info("RabbitMQ connected; consumer queue configured");

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
  QUEUE_NAME,
};
