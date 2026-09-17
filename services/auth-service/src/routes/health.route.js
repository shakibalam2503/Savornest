const express = require("express");
const { checkDatabase } = require("../config/database");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "auth-service",
    status: "healthy",
  });
});

router.get("/ready", async (req, res) => {
  try {
    await checkDatabase();

    res.status(200).json({
      success: true,
      service: "auth-service",
      status: "ready",
      dependencies: {
        postgres: "healthy",
      },
    });
  } catch (error) {
    req.log.error(
      {
        err: error,
      },
      "Readiness check failed"
    );

    res.status(503).json({
      success: false,
      service: "auth-service",
      status: "not_ready",
      dependencies: {
        postgres: "unhealthy",
      },
    });
  }
});

module.exports = router;