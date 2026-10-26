
const { pool } = require("../src/config/database");
const {
  registerUserProfile,
} = require("../src/services/user-registration.service");

describe("User registration idempotency", () => {
  const userId = "bdce8e50-d46b-453d-b012-123456789abc";
  const eventId = "a1111111-1111-4111-8111-111111111111";

  it("should not create duplicate profiles or roles", async () => {
    const userData = {
      eventId,
      eventType: "UserRegistered",
      userId,
      fullName: "Test User",
      role: "CUSTOMER",
    };

    await registerUserProfile(userData);
    await registerUserProfile(userData);
    await registerUserProfile(userData);

    const profiles = await pool.query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [userId]
    );

    const roles = await pool.query(
      "SELECT * FROM user_roles WHERE user_id = $1",
      [userId]
    );

    const processedEvents = await pool.query(
      "SELECT * FROM processed_events WHERE event_id = $1",
      [eventId]
    );

    expect(profiles.rows).toHaveLength(1);
    expect(roles.rows).toHaveLength(1);
    expect(processedEvents.rows).toHaveLength(1);
  }, 15000);
});

afterAll(async () => {
  await pool.end();
});
