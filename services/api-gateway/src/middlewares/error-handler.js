function errorHandler(err, req, res, next) {
  console.error("API Gateway error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}

module.exports = errorHandler;