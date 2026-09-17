const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      requestId: req.id,
    },
    err.message
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message:
        statusCode >= 500
          ? "Internal server error"
          : err.message,
    },
  });
};

module.exports = errorHandler;