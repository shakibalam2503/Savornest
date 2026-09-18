const authService = require("../services/auth.service");
async function register(req,res,next) {
    try{
        const user = await authService.register(req.body)
        res.status(201).json(
            {
                "success":true,
                "data":{
                    user,
                }
            }
        )
    }
    catch(error){
        next(error)
    }
    
}
async function login(req,res,next) {
    try{
        const result = await authService.login({...req.body,
            ip:req.ip,
            userAgent:req.get("user-agent")
        })
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
        res.status(200).json({
            "success":true,
            "data":{
                user:result.user,
            }
        })
    }
    catch(error){
        next(error)
    }
    
}
async function me(req, res, next){
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    const result = await authService.refreshAccessToken(
      refreshToken
    );

    res.cookie("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Access token refreshed",
    });
  } catch (error) {
    next(error);
  }
};
async function logout(req, res, next){
  try {
    await authService.logout(req.user.sessionId);

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
async function verifyEmail(req, res, next) {
  try {
    const result = await authService.verifyEmail(
      req.query.token
    );

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: result,
      },
    });
  } catch (error) {
    next(error);
  }
};
const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset(
      req.body.email
    );

    res.status(200).json({
      success: true,
      message:
        "If an account exists with that email, a password reset link has been sent.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(
      req.body.token,
      req.body.newPassword
    );

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: {
        user: result,
      },
    });
  } catch (error) {
    next(error);
  }
};
module.exports={
    register,
    login,
    logout,
    me,
    refresh,
    verifyEmail,
    forgotPassword,
    resetPassword
}