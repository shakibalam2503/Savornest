
jest.mock("../src/repositories/user.repository", () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  createUserWithClient: jest.fn(),
  findUserById: jest.fn(),
  verifyUserEmail: jest.fn(),
  updateUserPassword: jest.fn(),
}));

jest.mock("../src/repositories/outbox.repository", () => ({
  createOutboxEvent: jest.fn(),
  getPendingOutboxEvents: jest.fn(),
  markOutboxEventPublished: jest.fn(),
  recordOutboxPublishFailure: jest.fn(),
}));

jest.mock("../src/config/database", () => ({
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock("../src/services/verification.service", () => ({
  createVerificationToken: jest.fn(),
  getUserIdByVerificationToken: jest.fn(),
  deleteVerificationToken: jest.fn(),
}));

const bcrypt = require("bcryptjs");

const {
  findUserByEmail,
  createUserWithClient,
} = require("../src/repositories/user.repository");

const {
  createOutboxEvent,
} = require("../src/repositories/outbox.repository");

const { pool } = require("../src/config/database");

const {
  createVerificationToken,
} = require("../src/services/verification.service");

const authService = require("../src/services/auth.service");

describe("authService.register()", () => {
  let client;
  let user;

  beforeEach(() => {
    jest.clearAllMocks();

    client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };

    pool.connect.mockResolvedValue(client);

    user = {
      id: "user-123",
      email: "farmer@example.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      email_verified_at: null,
      created_at: new Date("2026-01-01T00:00:00.000Z"),
    };

    findUserByEmail.mockResolvedValue(null);
    createUserWithClient.mockResolvedValue(user);
    createOutboxEvent.mockResolvedValue({});
    createVerificationToken.mockResolvedValue(
      "verification-token-123"
    );
  });

  test("normalizes email, hashes password, creates user and outbox event, then generates verification token", async () => {
    const result = await authService.register({
      email: "  Farmer@Example.COM  ",
      password: "StrongPass123",
    });

    expect(findUserByEmail).toHaveBeenCalledWith(
      "farmer@example.com"
    );

    expect(pool.connect).toHaveBeenCalledTimes(1);

    expect(client.query).toHaveBeenCalledWith("BEGIN");

    expect(createUserWithClient).toHaveBeenCalledTimes(1);

    const [transactionClient, createUserArgument] =
      createUserWithClient.mock.calls[0];

    expect(transactionClient).toBe(client);
    expect(createUserArgument.email).toBe("farmer@example.com");
    expect(createUserArgument.passwordHash).not.toBe(
      "StrongPass123"
    );

    expect(
      await bcrypt.compare(
        "StrongPass123",
        createUserArgument.passwordHash
      )
    ).toBe(true);

    expect(createOutboxEvent).toHaveBeenCalledTimes(1);

    const [outboxClient, event] = createOutboxEvent.mock.calls[0];

    expect(outboxClient).toBe(client);
    expect(event).toMatchObject({
      aggregateType: "USER",
      aggregateId: "user-123",
      eventType: "UserRegistered",
      payload: {
        userId: "user-123",
        email: "farmer@example.com",
        role: "CUSTOMER",
        fullName: null,
        phone: null,
        avatarUrl: null,
      },
    });

    // The database row and event payload should share the same ID.
    expect(event.id).toBe(event.payload.eventId);

    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);

    expect(createVerificationToken).toHaveBeenCalledWith(
      "user-123"
    );

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

  test("rejects an existing email without starting a transaction", async () => {
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

    expect(pool.connect).not.toHaveBeenCalled();
    expect(createUserWithClient).not.toHaveBeenCalled();
    expect(createOutboxEvent).not.toHaveBeenCalled();
    expect(createVerificationToken).not.toHaveBeenCalled();
  });

  test("rolls back the transaction if user creation fails", async () => {
    createUserWithClient.mockRejectedValue(
      new Error("Database unavailable")
    );

    await expect(
      authService.register({
        email: "farmer@example.com",
        password: "StrongPass123",
      })
    ).rejects.toThrow("Database unavailable");

    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");

    expect(createOutboxEvent).not.toHaveBeenCalled();
    expect(createVerificationToken).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test("rolls back if outbox event creation fails", async () => {
    createOutboxEvent.mockRejectedValue(
      new Error("Outbox insert failed")
    );

    await expect(
      authService.register({
        email: "farmer@example.com",
        password: "StrongPass123",
      })
    ).rejects.toThrow("Outbox insert failed");

    expect(createUserWithClient).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(createVerificationToken).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
