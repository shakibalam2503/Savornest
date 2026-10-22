function errorHandler(err, req, res, next) {
  req.log?.error({ err, requestId: req.id }, "User Service error");

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message:
        statusCode < 500
          ? err.message
          : "An unexpected error occurred",
    },
  });
}

module.exports = errorHandler;