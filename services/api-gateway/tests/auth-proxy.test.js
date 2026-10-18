const express = require("express");
const http = require("http");
const request = require("supertest");

jest.mock("../src/config/env", () => ({
  nodeEnv: "test",
  port: 8000,
  authServiceUrl: "http://localhost:5001",
  frontendUrl: "http://localhost:3000",
}));

const app = require("../src/app");

describe("Auth proxy integration", () => {
  let upstream;
  let upstreamServer;

  beforeAll((done) => {
    upstream = express();

    upstream.get("/api/auth/me", (req, res) => {
      res.set("X-Upstream-Service", "auth-service");
      res.status(200).json({
        success: true,
        user: { id: "test-user" },
      });
    });

    upstream.post("/api/auth/login", (req, res) => {
      res.set("Set-Cookie", [
        "accessToken=test-access; HttpOnly; Path=/",
        "refreshToken=test-refresh; HttpOnly; Path=/",
      ]);

      res.status(200).json({ success: true });
    });

    upstreamServer = http.createServer(upstream);
    upstreamServer.listen(5001, "127.0.0.1", done);
  });

  afterAll((done) => {
    upstreamServer.close(done);
  });

  it("forwards requests to the Auth Service", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.headers["x-upstream-service"]).toBe(
      "auth-service"
    );
    expect(response.body).toEqual({
      success: true,
      user: { id: "test-user" },
    });
  });

  it("preserves Set-Cookie headers from the Auth Service", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "test-password" });

    expect(response.status).toBe(200);

    const cookies = response.headers["set-cookie"];

    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining("accessToken=test-access"),
        expect.stringContaining("refreshToken=test-refresh"),
      ])
    );
  });
});