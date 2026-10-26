const { pool } = require("../config/database");


async function createProfile(
  { userId, fullName = null, phone = null, avatarUrl = null },
  client = pool
) {
  const query = `
    INSERT INTO user_profiles (user_id, full_name, phone, avatar_url)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id, full_name, phone, avatar_url, status, created_at, updated_at
  `;

  const values = [userId, fullName, phone, avatarUrl];
  const { rows } = await client.query(query, values);

  if (rows[0]) {
    return rows[0];
  }

  const existingProfileQuery = `
    SELECT user_id, full_name, phone, avatar_url, status, created_at, updated_at
    FROM user_profiles
    WHERE user_id = $1
  `;

  const result = await client.query(existingProfileQuery, [userId]);
  return result.rows[0] || null;
}


async function findProfileByUserId(userId) {
  const query = `
    SELECT user_id, full_name, phone, avatar_url, status, created_at, updated_at
    FROM user_profiles
    WHERE user_id = $1
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function updateProfile(userId, { fullName, phone, avatarUrl }) {
  const query = `
    UPDATE user_profiles
    SET
      full_name = COALESCE($2, full_name),
      phone = COALESCE($3, phone),
      avatar_url = COALESCE($4, avatar_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING user_id, full_name, phone, avatar_url, status, created_at, updated_at
  `;

  const values = [userId, fullName ?? null, phone ?? null, avatarUrl ?? null];
  const { rows } = await pool.query(query, values);

  return rows[0] || null;
}

module.exports = {
  createProfile,
  findProfileByUserId,
  updateProfile,
};