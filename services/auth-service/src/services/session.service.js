const { redis } = require("../config/redis");

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

const getSessionKey = (sessionId) => {
  return `auth:session:${sessionId}`;
};

const getUserSessionsKey = (userId) => {
  return `auth:user:sessions:${userId}`;
};

const createSession = async ({
  sessionId,
  userId,
  ip,
  userAgent,
}) => {
  const session = {
    userId,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    ip,
    userAgent,
  };

  await redis.set(
    getSessionKey(sessionId),
    session,
    {
      ex: SESSION_TTL,
    }
  );

  await redis.sadd(
    getUserSessionsKey(userId),
    sessionId
  );

  return session;
};

const getSession = async (sessionId) => {
  return redis.get(getSessionKey(sessionId));
};

const deleteSession = async (sessionId) => {
  const session = await getSession(sessionId);

  if (!session) {
    return;
  }

  await redis.del(getSessionKey(sessionId));

  await redis.srem(
    getUserSessionsKey(session.userId),
    sessionId
  );
};

const deleteAllUserSessions = async (userId) => {
  const userSessionsKey = getUserSessionsKey(userId);

  const sessionIds = await redis.smembers(userSessionsKey);

  if (sessionIds.length === 0) {
    return;
  }

  const sessionKeys = sessionIds.map(
    (sessionId) => getSessionKey(sessionId)
  );

  await redis.del(...sessionKeys);

  await redis.del(userSessionsKey);
};

module.exports = {
  createSession,
  getSession,
  deleteSession,
  deleteAllUserSessions,
};