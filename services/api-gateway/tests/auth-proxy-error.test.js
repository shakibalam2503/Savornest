const request = require("supertest");

describe("Auth proxy error handling", () => {
  let app;

  beforeAll(() => {
    // Point the Gateway to a port where no service is listening.
    process.env.AUTH_SERVICE_URL = "http://127.0.0.1:59999";

    // Reload the app so it reads the test URL.
    jest.resetModules();
    app = require("../src/app");
  });

  it("returns 502 when the Auth Service is unavailable", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .timeout({ response: 3000, deadline: 5000 });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "Authentication service is temporarily unavailable",
      },
    });
  });
});
