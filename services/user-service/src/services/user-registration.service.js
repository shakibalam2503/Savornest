
const { pool } = require("../config/database");

const {
  createProfile,
} = require("../repositories/user-profile.repository");

const {
  createRole,
} = require("../repositories/user-role.repository");

async function registerUserProfile({
  userId,
  fullName = null,
  phone = null,
  avatarUrl = null,
  role = "CUSTOMER",
}) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const profile = await createProfile(
      { userId, fullName, phone, avatarUrl },
      client
    );

    if (!profile) {
      throw new Error("Failed to create or retrieve user profile");
    }

    const userRole = await createRole(userId, role, client);

    if (!userRole) {
      throw new Error("Failed to create or retrieve user role");
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return { profile, role: userRole };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  registerUserProfile,
};
