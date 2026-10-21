const express = require("express");
const request = require("supertest");

const mockLimit = jest.fn();

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation(() => ({
      limit: (...args) => mockLimit(...args),
    })),
    {
      slidingWindow: jest.fn(() => "mock-sliding-window"),
    }
  ),
}));

const rateLimiter = require("../src/middlewares/rate-limiter");

describe("Gateway rate limiter", () => {
  let app;

  beforeEach(() => {
    mockLimit.mockReset();

    app = express();

    app.use((req, res, next) => {
      req.log = { error: jest.fn() };
      next();
    });

    app.use(rateLimiter);

    app.get("/test", (req, res) => {
      res.status(200).json({ success: true });
    });
  });

  it("allows requests under the limit", async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 300,
      remaining: 299,
      reset: 1800000000000,
    });

    const response = await request(app).get("/test");

    expect(response.status).toBe(200);
    expect(response.headers["ratelimit-limit"]).toBe("300");
  });

  it("returns 429 when the limit is exceeded", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 300,
      remaining: 0,
      reset: 1800000000000,
    });

    const response = await request(app).get("/test");

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("returns 503 when Upstash fails", async () => {
    mockLimit.mockRejectedValue(new Error("Upstash unavailable"));

    const response = await request(app).get("/test");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("RATE_LIMITER_UNAVAILABLE");
  });
});
