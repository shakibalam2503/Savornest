const { randomUUID } = require("crypto");

function requestId(req, res, next) {
  const incomingId = req.get("X-Request-ID");

  const isValidUUID =
    typeof incomingId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      incomingId
    );

  req.id = isValidUUID ? incomingId : randomUUID();

  res.setHeader("X-Request-ID", req.id);

  next();
}

module.exports = requestId;
