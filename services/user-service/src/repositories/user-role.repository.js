const { pool } = require("../config/database");


async function createRole(userId, role = "CUSTOMER", client = pool) {
  const query = `
    INSERT INTO user_roles (user_id, role)
    VALUES ($1, $2)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING user_id, role, created_at, updated_at
  `;

  const { rows } = await client.query(query, [userId, role]);

  if (rows[0]) {
    return rows[0];
  }

  const existingRoleQuery = `
    SELECT user_id, role, created_at, updated_at
    FROM user_roles
    WHERE user_id = $1
  `;

  const result = await client.query(existingRoleQuery, [userId]);
  return result.rows[0] || null;
}


async function findRoleByUserId(userId) {
  const query = `
    SELECT user_id, role, created_at, updated_at
    FROM user_roles
    WHERE user_id = $1
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function updateRole(userId, role) {
  const query = `
    UPDATE user_roles
    SET role = $2, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING user_id, role, created_at, updated_at
  `;

  const { rows } = await pool.query(query, [userId, role]);
  return rows[0] || null;
}

module.exports = {
  createRole,
  findRoleByUserId,
  updateRole,
};