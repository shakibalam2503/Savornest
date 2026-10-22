const authServiceClient = require("../clients/auth-service.client");

function authenticate(req, res, next) {
  const authorization = req.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required",
      },
    });
  }

  const token = authorization.slice("Bearer ".length);

  authServiceClient
    .validateAccessToken(token)
    .then((identity) => {
      req.user = {
        userId: identity.userId,
        sessionId: identity.sessionId,
      };

      next();
    })
    .catch((error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return res.status(401).json({
          success: false,
          error: {
            code: "INVALID_ACCESS_TOKEN",
            message: "Invalid or expired access token",
          },
        });
      }

      req.log?.error(
        { err: error },
        "Auth Service validation request failed"
      );

      return res.status(503).json({
        success: false,
        error: {
          code: "AUTH_SERVICE_UNAVAILABLE",
          message: "Authentication service is temporarily unavailable",
        },
      });
    });
}

module.exports = authenticate;