const { pool } = require("../config/database");

const findUserByEmail = async (email) => {
  const query = `
    SELECT
      id,
      email,
      password_hash,
      role,
      status,
      email_verified_at,
      created_at,
      updated_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0] || null;
};

const createUser = async ({
  email,
  passwordHash,
  role = "CUSTOMER",
}) => {
  const query = `
    INSERT INTO users (
      email,
      password_hash,
      role
    )
    VALUES ($1, $2, $3)
    RETURNING
      id,
      email,
      password_hash,
      role,
      status,
      email_verified_at,
      created_at,
      updated_at
  `;

  const values = [email, passwordHash, role];

  const result = await pool.query(query, values);

  return result.rows[0];
};
const findUserById = async (userId) => {
  const query = `
    SELECT
      id,
      email,
      role,
      status,
      email_verified_at,
      created_at,
      updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [userId]);

  return result.rows[0] || null;
};

module.exports = {
  findUserByEmail,
  createUser,
  findUserById
};