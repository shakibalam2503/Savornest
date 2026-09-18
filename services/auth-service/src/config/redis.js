const { Redis } = require("@upstash/redis");

const config = require("./env");

const redis = new Redis({
  url: config.redisRestUrl,
  token: config.redisRestToken,
});

const checkRedis = async () => {
  const result = await redis.ping();

  return result === "PONG";
};

module.exports = {
  redis,
  checkRedis,
};