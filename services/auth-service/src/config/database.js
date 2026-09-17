const { Pool } = require("pg");
const config = require("./env");
const logger = require("./logger");

const pool = new Pool({
  connectionString: config.databaseUrl,

  // Neon requires SSL for remote PostgreSQL connections.
  ssl: {
    rejectUnauthorized: false,
  },

  // Connection pool configuration
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => {
  logger.error(
    {
      err: error,
    },
    "Unexpected PostgreSQL pool error"
  );
});

const connectDatabase = async () => {
  try {
    const client = await pool.connect();

    logger.info("PostgreSQL connection established");

    client.release();
  } catch (error) {
    logger.fatal(
      {
        err: error,
      },
      "Failed to connect to PostgreSQL"
    );

    throw error;
  }
};
const checkDatabase = async () => {
  const result = await pool.query("SELECT 1");

  return result.rows.length === 1;
};
module.exports = {
  pool,
  connectDatabase,checkDatabase
};