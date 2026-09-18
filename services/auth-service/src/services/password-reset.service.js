const { randomUUID } = require("crypto");

const { redis } = require("../config/redis");

const PASSWORD_RESET_TOKEN_TTL = 30 * 60; // 30 minutes expiry

const createPasswordResetToken = async (userId) => {
  const token = randomUUID();

  await redis.set(
    `auth:password-reset:${token}`,
    userId,
    {
      ex: PASSWORD_RESET_TOKEN_TTL,
    }
  );

  return token;
};

const getUserIdByPasswordResetToken = async (token) => {
  return redis.get(`auth:password-reset:${token}`);
};

const deletePasswordResetToken = async (token) => {
  await redis.del(`auth:password-reset:${token}`);
};

module.exports = {
  createPasswordResetToken,
  getUserIdByPasswordResetToken,
  deletePasswordResetToken,
};