const { Pool } = require("pg");
const env = require("./env");
const logger = require("./logger");

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected PostgreSQL pool error");
});

async function connectDatabase() {
  await pool.query("SELECT 1");
  logger.info("PostgreSQL connection established");
}

module.exports = {
  pool,
  connectDatabase,
};