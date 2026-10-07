
jest.mock("../src/repositories/user.repository", () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  findUserById: jest.fn(),
  verifyUserEmail: jest.fn(),
  updateUserPassword: jest.fn(),
}));

jest.mock("../src/services/verification.service", () => ({
  createVerificationToken: jest.fn(),
  getUserIdByVerificationToken: jest.fn(),
  deleteVerificationToken: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const {
  findUserByEmail,
  createUser,
} = require("../src/repositories/user.repository");

const {
  createVerificationToken,
} = require("../src/services/verification.service");

const authService = require("../src/services/auth.service");

describe("authService.register()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normalizes email, hashes password, creates user, and generates verification token", async () => {
    findUserByEmail.mockResolvedValue(null);

    createUser.mockResolvedValue({
      id: "user-123",
      email: "farmer@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      email_verified_at: null,
      created_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    createVerificationToken.mockResolvedValue("verification-token-123");

    const result = await authService.register({
      email: "  Farmer@Example.COM  ",
      password: "StrongPass123",
    });

    expect(findUserByEmail).toHaveBeenCalledWith(
      "farmer@example.com"
    );

    expect(createUser).toHaveBeenCalledTimes(1);

    const createUserArgument = createUser.mock.calls[0][0];

    expect(createUserArgument.email).toBe("farmer@example.com");
    expect(createUserArgument.passwordHash).not.toBe("StrongPass123");
    expect(
      await bcrypt.compare(
        "StrongPass123",
        createUserArgument.passwordHash
      )
    ).toBe(true);

    expect(createVerificationToken).toHaveBeenCalledWith("user-123");

    expect(result).toEqual({
      id: "user-123",
      email: "farmer@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerifiedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      verificationToken: "verification-token-123",
    });
  });

  test("rejects an existing email without creating a user", async () => {
    findUserByEmail.mockResolvedValue({
      id: "existing-user",
      email: "farmer@example.com",
    });

    await expect(
      authService.register({
        email: "Farmer@Example.com",
        password: "StrongPass123",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "EMAIL_ALREADY_EXISTS",
    });

    expect(createUser).not.toHaveBeenCalled();
    expect(createVerificationToken).not.toHaveBeenCalled();
  });

  test("does not create a verification token if user creation fails", async () => {
    findUserByEmail.mockResolvedValue(null);
    createUser.mockRejectedValue(new Error("Database unavailable"));

    await expect(
      authService.register({
        email: "farmer@example.com",
        password: "StrongPass123",
      })
    ).rejects.toThrow("Database unavailable");

    expect(createVerificationToken).not.toHaveBeenCalled();
  });
});
