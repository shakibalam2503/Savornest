const express = require("express");
const { pool } = require("../config/database");

const router = express.Router();

router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    service: "user-service",
    status: "alive",
  });
});

router.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      success: true,
      service: "user-service",
      status: "ready",
    });
  } catch (error) {
    req.log?.error({ err: error }, "Database readiness check failed");

    return res.status(503).json({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Database is not ready",
      },
    });
  }
});

module.exports = router;