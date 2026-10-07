
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

const {
  findUserById,
} = require("../src/repositories/user.repository");

const {
  getSession,
} = require("../src/services/session.service");

const {
  generateAccessToken,
  verifyRefreshToken,
} = require("../src/services/token.service");

const authService = require("../src/services/auth.service");

describe("authService.refreshAccessToken()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateAccessToken.mockReturnValue("new-access-token");
  });

  test("rejects a missing refresh token", async () => {
    await expect(
      authService.refreshAccessToken()
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "REFRESH_TOKEN_REQUIRED",
    });

    expect(verifyRefreshToken).not.toHaveBeenCalled();
  });

  test("rejects an invalid refresh token", async () => {
    const error = new Error("Invalid token");
    error.name = "JsonWebTokenError";
    verifyRefreshToken.mockImplementation(() => {
      throw error;
    });

    await expect(
      authService.refreshAccessToken("invalid-token")
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
    });
  });

  test("rejects an expired refresh token", async () => {
    const error = new Error("Token expired");
    error.name = "TokenExpiredError";
    verifyRefreshToken.mockImplementation(() => {
      throw error;
    });

    await expect(
      authService.refreshAccessToken("expired-token")
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "REFRESH_TOKEN_EXPIRED",
    });
  });

  test("rejects a token with the wrong type", async () => {
    verifyRefreshToken.mockReturnValue({
      type: "access",
      userId: "user-123",
      sessionId: "session-123",
    });

    await expect(
      authService.refreshAccessToken("wrong-type-token")
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
    });

    expect(getSession).not.toHaveBeenCalled();
  });

  test("rejects a missing or deleted session", async () => {
    verifyRefreshToken.mockReturnValue({
      type: "refresh",
      userId: "user-123",
      sessionId: "session-123",
    });

    getSession.mockResolvedValue(null);

    await expect(
      authService.refreshAccessToken("valid-refresh-token")
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "SESSION_INVALID",
    });

    expect(findUserById).not.toHaveBeenCalled();
  });

  test("rejects a user who no longer exists", async () => {
    verifyRefreshToken.mockReturnValue({
      type: "refresh",
      userId: "user-123",
      sessionId: "session-123",
    });

    getSession.mockResolvedValue({
      userId: "user-123",
    });

    findUserById.mockResolvedValue(null);

    await expect(
      authService.refreshAccessToken("valid-refresh-token")
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "USER_NOT_FOUND",
    });
  });

  test("rejects an inactive user", async () => {
    verifyRefreshToken.mockReturnValue({
      type: "refresh",
      userId: "user-123",
      sessionId: "session-123",
    });

    getSession.mockResolvedValue({
      userId: "user-123",
    });

    findUserById.mockResolvedValue({
      id: "user-123",
      role: "CUSTOMER",
      status: "SUSPENDED",
    });

    await expect(
      authService.refreshAccessToken("valid-refresh-token")
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "ACCOUNT_NOT_ACTIVE",
    });

    expect(generateAccessToken).not.toHaveBeenCalled();
  });

  test("issues a new access token for a valid session and active user", async () => {
    verifyRefreshToken.mockReturnValue({
      type: "refresh",
      userId: "user-123",
      sessionId: "session-123",
    });

    getSession.mockResolvedValue({
      userId: "user-123",
    });

    findUserById.mockResolvedValue({
      id: "user-123",
      role: "CUSTOMER",
      status: "ACTIVE",
    });

    const result = await authService.refreshAccessToken(
      "valid-refresh-token"
    );

    expect(generateAccessToken).toHaveBeenCalledWith({
      userId: "user-123",
      role: "CUSTOMER",
      sessionId: "session-123",
    });

    expect(result).toEqual({
      accessToken: "new-access-token",
    });
  });
});
