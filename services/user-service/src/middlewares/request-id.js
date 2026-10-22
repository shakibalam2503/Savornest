const { randomUUID } = require("crypto");

function requestId(req, res, next) {
  const id = randomUUID();

  req.id = id;
  res.setHeader("X-Request-ID", id);

  next();
}

module.exports = requestId;