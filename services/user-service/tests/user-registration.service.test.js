const { pool } = require("../src/config/database");
const {
  registerUserProfile,
} = require("../src/services/user-registration.service");

describe("User registration idempotency", () => {
  const userId = "bdce8e50-d46b-453d-b012-123456789abc";

  it("should not create duplicate profiles or roles", async () => {
    const userData = {
      userId,
      fullName: "Duplicate Test",
      role: "CUSTOMER",
    };

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

    expect(profiles.rows).toHaveLength(1);
    expect(roles.rows).toHaveLength(1);
  },15000);
});
afterAll(async () => {
  await pool.end();
});