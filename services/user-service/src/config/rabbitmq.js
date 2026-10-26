
const amqp = require("amqplib");
const env = require("./env");
const logger = require("./logger");

let connection = null;
let channel = null;
let connectPromise = null;
let reconnectTimer = null;
let shuttingDown = false;
let recoveryHandler = null;

const RECONNECT_DELAY_MS = 3000;

const EXCHANGE_NAME = "savornest.events";
const QUEUE_NAME = "user-service.user-registered";
const ROUTING_KEY = "UserRegistered";

const RETRY_EXCHANGE = "user-service.retry.exchange";
const RETRY_QUEUE = "user-service.user-registered.retry";
const RETRY_ROUTING_KEY = "user-registered.retry";

const DLQ_EXCHANGE = "user-service.dlq.exchange";
const DLQ_QUEUE = "user-service.user-registered.dlq";
const DLQ_ROUTING_KEY = "user-registered.dlq";
let startPromise = null;
async function setupQueues(ch) {
  await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
  await ch.assertExchange(RETRY_EXCHANGE, "direct", { durable: true });
  await ch.assertExchange(DLQ_EXCHANGE, "direct", { durable: true });

  await ch.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000,
      "x-dead-letter-exchange": EXCHANGE_NAME,
      "x-dead-letter-routing-key": ROUTING_KEY,
    },
  });

  await ch.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, RETRY_ROUTING_KEY);

  await ch.assertQueue(DLQ_QUEUE, { durable: true });
  await ch.bindQueue(DLQ_QUEUE, DLQ_EXCHANGE, DLQ_ROUTING_KEY);

  await ch.assertQueue(QUEUE_NAME, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": RETRY_EXCHANGE,
      "x-dead-letter-routing-key": RETRY_ROUTING_KEY,
    },
  });

  await ch.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
}

function scheduleReconnect() {
  if (shuttingDown || reconnectTimer) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    if (shuttingDown) return;

    try {
      await connectRabbitMQ();

      logger.info("RabbitMQ connection recovered");

      if (recoveryHandler) {
        await recoveryHandler();
      }
    } catch (error) {
      logger.error({ err: error }, "RabbitMQ reconnect attempt failed");
      scheduleReconnect();
    }
  }, RECONNECT_DELAY_MS);
}

async function connectRabbitMQ() {
  if (shuttingDown) {
    throw new Error("RabbitMQ is shutting down");
  }

  if (channel) return channel;
  if (connectPromise) return connectPromise;

  if (!env.rabbitmqUrl) {
    throw new Error("RABBITMQ_URL is not configured");
  }

  connectPromise = (async () => {
    let newConnection;

    try {
      newConnection = await amqp.connect(env.rabbitmqUrl);
      const newChannel = await newConnection.createConfirmChannel();

      await setupQueues(newChannel);

      connection = newConnection;
      channel = newChannel;

      newConnection.on("error", (error) => {
        logger.error({ err: error }, "RabbitMQ connection error");
      });

      newConnection.on("close", () => {
        if (connection !== newConnection) return;

        logger.warn("RabbitMQ connection closed");

        connection = null;
        channel = null;

        scheduleReconnect();
      });

      newChannel.on("error", (error) => {
        logger.error({ err: error }, "RabbitMQ channel error");
      });

      newChannel.on("close", () => {
  if (channel !== newChannel) return;

  logger.warn("RabbitMQ channel closed");

  channel = null;

  // Let the connection's own close handler clear its reference
  // and schedule reconnection. A closed channel doesn't always
  // mean the underlying connection is closed.
  if (connection === newConnection) {
    newConnection.close().catch((error) => {
      logger.warn({ err: error }, "Error closing stale RabbitMQ connection");
    });
  } else {
    scheduleReconnect();
  }
});

      logger.info("RabbitMQ connected; queues configured");

      return newChannel;
    } catch (error) {
      if (newConnection) {
        await newConnection.close().catch(() => {});
      }
      throw error;
    }
  })();

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
}

function getRabbitMQChannel() {
  return channel;
}

function setRabbitMQRecoveryHandler(handler) {
  recoveryHandler = handler;
}

async function closeRabbitMQ() {
  shuttingDown = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const currentChannel = channel;
  const currentConnection = connection;

  channel = null;
  connection = null;

  if (currentChannel) {
    await currentChannel.close().catch(() => {});
  }

  if (currentConnection) {
    await currentConnection.close().catch(() => {});
  }
}

module.exports = {
  connectRabbitMQ,
  getRabbitMQChannel,
  closeRabbitMQ,
  setRabbitMQRecoveryHandler,
  QUEUE_NAME,
  RETRY_QUEUE,
  DLQ_QUEUE,
  DLQ_EXCHANGE,
  DLQ_ROUTING_KEY,
};
