
jest.mock("../src/repositories/user.repository", () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  findUserById: jest.fn(),
  verifyUserEmail: jest.fn(),
  updateUserPassword: jest.fn(),
}));

jest.mock("../src/services/session.service", () => ({
  createSession: jest.fn(),
  getSession: jest.fn(),
  deleteSession: jest.fn(),
  deleteAllUserSessions: jest.fn(),
}));

jest.mock("../src/services/token.service", () => ({
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const {
  findUserByEmail,
} = require("../src/repositories/user.repository");

const {
  createSession,
} = require("../src/services/session.service");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../src/services/token.service");

const authService = require("../src/services/auth.service");

describe("authService.login()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateAccessToken.mockReturnValue("access-token");
    generateRefreshToken.mockReturnValue("refresh-token");
    createSession.mockResolvedValue(undefined);
  });

  test("logs in with valid credentials", async () => {
    const passwordHash = await bcrypt.hash("StrongPass123", 4);

    findUserByEmail.mockResolvedValue({
      id: "user-123",
      email: "farmer@example.com",
      password_hash: passwordHash,
      role: "CUSTOMER",
      status: "ACTIVE",
      email_verified_at: null,
    });

    const result = await authService.login({
      email: " Farmer@Example.com ",
      password: "StrongPass123",
      ip: "127.0.0.1",
      userAgent: "Jest",
    });

    expect(findUserByEmail).toHaveBeenCalledWith(
      "farmer@example.com"
    );
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        ip: "127.0.0.1",
        userAgent: "Jest",
      })
    );
    expect(result.user.email).toBe("farmer@example.com");
    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
  });

  test("rejects an unknown email", async () => {
    findUserByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: "unknown@example.com",
        password: "StrongPass123",
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });

    expect(createSession).not.toHaveBeenCalled();
  });

  test("rejects an incorrect password", async () => {
    const passwordHash = await bcrypt.hash("CorrectPass123", 4);

    findUserByEmail.mockResolvedValue({
      id: "user-123",
      email: "farmer@example.com",
      password_hash: passwordHash,
      role: "CUSTOMER",
      status: "ACTIVE",
    });

    await expect(
      authService.login({
        email: "farmer@example.com",
        password: "WrongPass123",
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });

    expect(createSession).not.toHaveBeenCalled();
  });

  test("rejects a Google-only account with no password hash", async () => {
    findUserByEmail.mockResolvedValue({
      id: "google-user-123",
      email: "farmer@example.com",
      password_hash: null,
      role: "CUSTOMER",
      status: "ACTIVE",
    });

    await expect(
      authService.login({
        email: "farmer@example.com",
        password: "AnyPassword123",
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });

    expect(createSession).not.toHaveBeenCalled();
  });
});
