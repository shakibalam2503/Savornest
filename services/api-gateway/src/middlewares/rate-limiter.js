const { Ratelimit } = require("@upstash/ratelimit");
const redis = require("../config/redis");

const gatewayRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, "15 m"),
  prefix: "rl:gateway",
});

async function rateLimiter(req, res, next) {
  try {
    const { success, limit, remaining, reset } =
      await gatewayRateLimiter.limit(req.ip);

    res.setHeader("RateLimit-Limit", limit);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", String(reset));

    if (!success) {
      return res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      });
    }

    return next();
  } catch (err) {
    req.log?.error({ err }, "Gateway rate limiter failed");

    return res.status(503).json({
      success: false,
      error: {
        code: "RATE_LIMITER_UNAVAILABLE",
        message: "Request processing is temporarily unavailable",
      },
    });
  }
}

module.exports = rateLimiter;
