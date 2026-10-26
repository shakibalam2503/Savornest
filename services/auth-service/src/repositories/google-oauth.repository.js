const { randomUUID } = require("crypto");
const { pool } = require("../config/database");
const { createOutboxEvent } = require("./outbox.repository");

async function findOrCreateUser(googleId, email, name ) {
  const normalizedEmail = email.trim().toLowerCase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check whether this Google account is already linked.
    const existingGoogleAccount = await client.query(
      `
      SELECT
        u.id,
        u.email,
        u.role,
        u.status,
        u.email_verified_at,
        u.created_at,
        u.updated_at
      FROM oauth_accounts oa
      JOIN users u ON u.id = oa.user_id
      WHERE oa.provider = $1
        AND oa.provider_account_id = $2
      LIMIT 1
      `,
      ["google", googleId]
    );

    if (existingGoogleAccount.rows.length > 0) {
      await client.query("COMMIT");

      return {
        user: existingGoogleAccount.rows[0],
        created: false,
        requiresLinking: false,
      };
    }

    // 2. Do not silently link Google to an existing account.
    const existingUser = await client.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");

      return {
        user: null,
        created: false,
        requiresLinking: true,
      };
    }

    // 3. Create the authentication account.
    const userResult = await client.query(
      `
      INSERT INTO users (
        email,
        password_hash,
        role,
        email_verified_at
      )
      VALUES ($1, NULL, $2, CURRENT_TIMESTAMP)
      RETURNING
        id,
        email,
        role,
        status,
        email_verified_at,
        created_at,
        updated_at
      `,
      [normalizedEmail, "CUSTOMER"]
    );

    const user = userResult.rows[0];

    // 4. Link the Google identity.
    await client.query(
      `
      INSERT INTO oauth_accounts (
        user_id,
        provider,
        provider_account_id
      )
      VALUES ($1, $2, $3)
      `,
      [user.id, "google", googleId]
    );

    // 5. Record UserRegistered in the SAME transaction.
    const eventId = randomUUID();

    await createOutboxEvent(client, {
      id: eventId,
      aggregateType: "USER",
      aggregateId: user.id,
      eventType: "UserRegistered",
      payload: {
        eventId,
        userId: user.id,
        email: user.email,
        fullName: name,
        role: user.role,
        phone: null,
        avatarUrl: null,
      },
    });

    // 6. Commit user, OAuth account, and outbox event together.
    await client.query("COMMIT");

    return {
      user,
      created: true,
      requiresLinking: false,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original error.
    }

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findOrCreateUser,
};
