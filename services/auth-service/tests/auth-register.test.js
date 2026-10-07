
jest.mock("../src/services/auth.service", () => ({
  register: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const authService = require("../src/services/auth.service");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("registers a user with valid input", async () => {
    const mockUser = {
      id: "test-user-id",
      email: "farmer@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
    };

    authService.register.mockResolvedValue(mockUser);

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "farmer@example.com",
        password: "StrongPass123",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toEqual(mockUser);

    expect(authService.register).toHaveBeenCalledWith({
      email: "farmer@example.com",
      password: "StrongPass123",
    });
  });

  test("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "not-an-email",
        password: "StrongPass123",
      });

    expect(response.status).toBe(400);
    expect(authService.register).not.toHaveBeenCalled();
  });

  test("rejects a password shorter than 8 characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "farmer@example.com",
        password: "short",
      });

    expect(response.status).toBe(400);
    expect(authService.register).not.toHaveBeenCalled();
  });
});
