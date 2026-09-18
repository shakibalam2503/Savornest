const { redis } = require("../config/redis");

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

async function createSession({sessionId,userId,ip,userAgent}) {
  const session = {
    userId,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    ip,
    userAgent,
  };

  await redis.set(
    `auth:session:${sessionId}`,
    session,
    {
      ex: SESSION_TTL,
    }
  );

  return session;
};

async function getSession(sessionId){
  return redis.get(`auth:session:${sessionId}`);
};

async function deleteSession (sessionId){
  await redis.del(`auth:session:${sessionId}`);
};

module.exports = {
  createSession,
  getSession,
  deleteSession,
};