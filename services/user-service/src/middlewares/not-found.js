function notFound(req, res) {
  return res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested route was not found",
    },
  });
}

module.exports = notFound;