const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT),
  authServiceUrl:process.env.AUTH_SERVICE_URL,
  userServiceUrl:process.env.USER_SERVICE_URL,
  frontendUrl:process.env.FRONTEND_URL,
};

module.exports = env;