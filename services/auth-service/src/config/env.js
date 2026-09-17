require("dotenv").config()

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5001,
  databaseUrl: process.env.DATABASE_URL,
  redisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
  redisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
};
module.exports=config