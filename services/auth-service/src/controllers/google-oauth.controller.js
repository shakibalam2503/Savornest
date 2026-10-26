const {
  createGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken
} = require("../services/google-oauth.service");
const authService= require("../services/auth.service")

async function initiateGoogleLogin(req, res, next) {
  try {
    const authorizationUrl =
      await createGoogleAuthorizationUrl();

    return res.redirect(302, authorizationUrl);
  } catch (error) {
    next(error);
  }
}

async function googleCallback(req, res, next) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        success:false,
        message: "Google authentication was cancelled",
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success:false,
        message: "Missing Google authorization code or state",
      });
    }

    const tokens = await exchangeGoogleAuthorizationCode(
      code,
      state
    );
    const googleUser = await verifyGoogleIdToken(tokens.id_token);
    /**
      Find or create the SavorNest user,
      then create a Redis session and SavorNest JWTs.
    **/
    const result = await authService.loginWithGoogle({
      googleId: googleUser.googleId,
      email: googleUser.email,
      name: googleUser.name,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

  // Set the same HttpOnly cookies as regular login.
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
      success:true,
      message: "Google Log in Successful",
      data:{
        user:result.user,
      }
    });
  } catch (error) {
    req.log.error(
      {
        err: error,
      },
      "Google OAuth callback failed"
    );

    next(error);
  }
}

module.exports = {
  initiateGoogleLogin,
  googleCallback,
};