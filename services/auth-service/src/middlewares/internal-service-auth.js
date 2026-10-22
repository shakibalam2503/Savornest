const crypto = require("crypto");
const config = require("../config/env");

function authenticateInternalService(req, res, next) {
  const providedKey = req.get("x-internal-service-key");
  const expectedKey = config.internalServiceKey;

  if (
    typeof providedKey !== "string" ||
    typeof expectedKey !== "string" ||
    providedKey.length !== expectedKey.length ||
    !crypto.timingSafeEqual(
      Buffer.from(providedKey),
      Buffer.from(expectedKey)
    )
  ) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_SERVICE_CREDENTIALS",
        message: "Service authentication failed",
      },
    });
  }

  next();
}

module.exports = authenticateInternalService;