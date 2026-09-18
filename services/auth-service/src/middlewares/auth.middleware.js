const {
  verifyAccessToken,
} = require("../services/token.service");

const AppError = require("../errors/AppError");

const authenticate = (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      throw new AppError(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const payload = verifyAccessToken(accessToken);

    if (payload.type !== "access") {
      throw new AppError(
        "Invalid access token",
        401,
        "INVALID_ACCESS_TOKEN"
      );
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new AppError(
          "Access token has expired",
          401,
          "ACCESS_TOKEN_EXPIRED"
        )
      );
    }

    if (error.name === "JsonWebTokenError") {
      return next(
        new AppError(
          "Invalid access token",
          401,
          "INVALID_ACCESS_TOKEN"
        )
      );
    }

    next(error);
  }
};

module.exports = authenticate;