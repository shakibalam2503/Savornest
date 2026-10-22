
const amqp = require("amqplib");
const config = require("./env");
const logger = require("./logger");

let connection;
let channel;

async function connectRabbitMQ() {
  if (channel) {
    return channel;
  }

  connection = await amqp.connect(config.rabbitmqUrl);

  connection.on("error", (error) => {
    logger.error({ err: error }, "RabbitMQ connection error");
  });

  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    connection = null;
    channel = null;
  });

  channel = await connection.createConfirmChannel();

  logger.info("RabbitMQ connected successfully");

  return channel;
}

function getRabbitMQChannel() {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

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
};
