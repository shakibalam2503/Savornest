const { pool } = require("../config/database");

const {createProfile,} = require("../repositories/user-profile.repository");
const {createRole,} = require("../repositories/user-role.repository");

async function registerUserProfile({
  eventId,
  eventType = "UserRegistered",
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

    // Step 1: Register this event as processed.
    // If the event ID already exists, do not process it again.
    const eventResult = await client.query(
      `INSERT INTO processed_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId, eventType]
    );

    if (eventResult.rowCount === 0) {
      await client.query("COMMIT");
      transactionStarted = false;

      return { duplicate: true };
    }

    // Step 2: Create the user profile.
    const profile = await createProfile(
      { userId, fullName, phone, avatarUrl },
      client
    );

    if (!profile) {
      throw new Error("Failed to create or retrieve user profile");
    }

    // Step 3: Create the user role.
    const userRole = await createRole(userId, role, client);

    if (!userRole) {
      throw new Error("Failed to create or retrieve user role");
    }

    // Step 4: Commit the event, profile, and role together.
    await client.query("COMMIT");
    transactionStarted = false;

    return {
      duplicate: false,
      profile,
      role: userRole,
    };
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
