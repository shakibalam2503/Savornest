const request = require("supertest");

jest.mock("http-proxy-middleware", () => ({
  createProxyMiddleware: () => (req, res, next) => next(),
}));

const app = require("../src/app");

describe("API Gateway health endpoint", () => {
  it("returns HTTP 200 when healthy", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      service: "api-gateway",
      status: "healthy",
    });
  });
});