jest.mock("../src/config/database", () => ({
  pool: {
    query: jest.fn(),
  },
}));

const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/database");

describe("User Service Health Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 when the service is running", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        service: "user-service",
        status: "alive",
      });
    });
  });

  describe("GET /ready", () => {
    it("should return 200 when PostgreSQL is available", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });

      const response = await request(app).get("/ready");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        service: "user-service",
        status: "ready",
      });
      expect(pool.query).toHaveBeenCalledWith("SELECT 1");
    });

    it("should return 503 when PostgreSQL is unavailable", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app).get("/ready");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database is not ready",
        },
      });
    });
  });
});