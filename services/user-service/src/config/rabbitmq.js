
const amqp = require("amqplib");
const env = require("./env");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "savornest.events";
const QUEUE_NAME = "user-service.user-registered";
const ROUTING_KEY = "UserRegistered";

const RETRY_EXCHANGE = "user-service.retry.exchange";
const RETRY_QUEUE = "user-service.user-registered.retry";
const RETRY_ROUTING_KEY = "user-registered.retry";

const DLQ_EXCHANGE = "user-service.dlq.exchange";
const DLQ_QUEUE = "user-service.user-registered.dlq";
const DLQ_ROUTING_KEY = "user-registered.dlq";

async function setupQueues(channel) {
  // Main event exchange.
  await channel.assertExchange(EXCHANGE_NAME, "topic", {
    durable: true,
  });

  // Retry and dead-letter exchanges.
  await channel.assertExchange(RETRY_EXCHANGE, "direct", {
    durable: true,
  });

  await channel.assertExchange(DLQ_EXCHANGE, "direct", {
    durable: true,
  });

  // Failed messages wait 5 seconds before returning to the main exchange.
  await channel.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
      "x-dead-letter-exchange": EXCHANGE_NAME,
      "x-dead-letter-routing-key": ROUTING_KEY,
    },
  });

  await channel.bindQueue(
    RETRY_QUEUE,
    RETRY_EXCHANGE,
    RETRY_ROUTING_KEY
  );

  // Permanently failed messages are stored here.
  await channel.assertQueue(DLQ_QUEUE, {
    durable: true,
  });

  await channel.bindQueue(
    DLQ_QUEUE,
    DLQ_EXCHANGE,
    DLQ_ROUTING_KEY
  );

  // Rejected main-queue messages go to the retry queue.
  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RETRY_EXCHANGE,
      "x-dead-letter-routing-key": RETRY_ROUTING_KEY,
    },
  });

  await channel.bindQueue(
    QUEUE_NAME,
    EXCHANGE_NAME,
    ROUTING_KEY
  );
}

async function connectRabbitMQ() {
  if (channel) return channel;

  if (!env.rabbitmqUrl) {
    throw new Error("RABBITMQ_URL is not configured");
  }

  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createConfirmChannel();

  await setupQueues(channel);

  connection.on("error", (error) => {
    logger.error({ err: error }, "RabbitMQ connection error");
  });

  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    connection = null;
    channel = null;
  });

  logger.info("RabbitMQ connected; queues configured");

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
  RETRY_QUEUE,
  DLQ_QUEUE,
  DLQ_EXCHANGE,
  DLQ_ROUTING_KEY,
};
