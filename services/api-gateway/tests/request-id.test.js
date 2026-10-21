const request = require("supertest");

const app = require("../src/app");

describe("Request ID middleware", () => {
  it("returns a request ID in the response headers", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toBeDefined();
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f-]{36}$/i
    );
  });

  it("generates a different ID for each request", async () => {
    const first = await request(app).get("/health");
    const second = await request(app).get("/health");

    expect(first.headers["x-request-id"]).not.toBe(
      second.headers["x-request-id"]
    );
  });
});