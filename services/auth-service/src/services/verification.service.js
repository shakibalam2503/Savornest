const { randomUUID } = require("crypto");

const { redis } = require("../config/redis");

const VERIFICATION_TOKEN_TTL = 30 * 60; // 30 minutes

const createVerificationToken = async (userId) => {
  const token = randomUUID();

  await redis.set(
    `auth:email-verification:${token}`,
    userId,
    {
      ex: VERIFICATION_TOKEN_TTL,
    }
  );

  return token;
};

const getUserIdByVerificationToken = async (token) => {
  return redis.get(`auth:email-verification:${token}`);
};

const deleteVerificationToken = async (token) => {
  await redis.del(`auth:email-verification:${token}`);
};

module.exports = {
  createVerificationToken,
  getUserIdByVerificationToken,
  deleteVerificationToken,
};