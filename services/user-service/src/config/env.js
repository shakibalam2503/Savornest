
const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5002,
  databaseUrl: process.env.DATABASE_URL,
  authServiceUrl: process.env.AUTH_SERVICE_URL,
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

module.exports = env;
