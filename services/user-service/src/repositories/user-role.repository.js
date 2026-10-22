const { pool } = require("../config/database");

async function createRole(userId, role = "CUSTOMER") {
  const query = `
    INSERT INTO user_roles (user_id, role)
    VALUES ($1, $2)
    RETURNING user_id, role, created_at, updated_at
  `;

  const { rows } = await pool.query(query, [userId, role]);
  return rows[0];
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