const bcrypt = require("bcryptjs");
const {randomUUID}=require("crypto")
const { pool } = require("../config/database");
const {createSession,getSession,deleteSession,deleteAllUserSessions}=require("./session.service")
const {generateAccessToken,generateRefreshToken,verifyAccessToken,verifyRefreshToken}=require("./token.service")
const {createVerificationToken,getUserIdByVerificationToken,deleteVerificationToken} = require("./verification.service");
const {createPasswordResetToken,getUserIdByPasswordResetToken,deletePasswordResetToken} = require("./password-reset.service");
const {
  findUserByEmail,
  createUser,
  findUserById,
  verifyUserEmail,
  updateUserPassword,
  createUserWithClient

} = require("../repositories/user.repository");
const {
  findOrCreateUser,
} = require("../repositories/google-oauth.repository");
const { createOutboxEvent } = require("../repositories/outbox.repository");
const AppError = require("../errors/AppError");


const register = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists",
      409,
      "EMAIL_ALREADY_EXISTS"
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const client = await pool.connect();

  let user;

  try {
    await client.query("BEGIN");

    // Create the authentication account.
    user = await createUserWithClient(client, {
      email: normalizedEmail,
      passwordHash,
    });
    const eventId=randomUUID()
    // Record the event in the same transaction.
    await createOutboxEvent(client, {
      id:eventId,
      aggregateType: "USER",
      aggregateId: user.id,
      eventType: "UserRegistered",
      payload: {
        eventId, 
        userId: user.id,
        email: user.email,
        role: "CUSTOMER",
        fullName: null,
        phone: null,
        avatarUrl: null,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    // Handle concurrent registrations for the same email.
    if (error.code === "23505") {
      throw new AppError(
        "An account with this email already exists",
        409,
        "EMAIL_ALREADY_EXISTS"
      );
    }

    throw error;
  } finally {
    client.release();
  }

  // Preserve the existing email-verification flow.
  const verificationToken = await createVerificationToken(user.id);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    createdAt: user.created_at,
    verificationToken,
  };
};

async function login({email,password,ip,userAgent}) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await findUserByEmail(normalizedEmail);

  if(!user){
    throw new AppError("Invalid email or password",401,"INVALID_CREDENTIALS")
  }
  const retrivedPasswordHash = user.password_hash;
  if (!retrivedPasswordHash) {
  throw new AppError(
    "Invalid email or password",
    401,
    "INVALID_CREDENTIALS"
  );
}
  const isMatch = await bcrypt.compare(password,retrivedPasswordHash);
  if (!isMatch) {
    throw new AppError("Invalid email or password",401,"INVALID_CREDENTIALS")
  }
  const sessionId=randomUUID()
  const accessToken = generateAccessToken({userId:user.id,role:user.role,sessionId})
  const refreshToken = generateRefreshToken({userId:user.id,
    sessionId})
  await createSession({sessionId,userId:user.id,ip,userAgent})
  
  return{
    user:{
      id: user.id,
      email:user.email,
      role:user.role,
      status:user.status,
      emailVerifiedAt:user.email_verified_at
    },
    accessToken,
    refreshToken
  
}
}
async function loginWithGoogle({ googleId, email, ip, userAgent }) {
  const result = await findOrCreateUser(googleId, email);

  if (result.requiresLinking) {
    throw new AppError(
      "An account with this email already exists. Please sign in using your existing login method.",
      409,
      "GOOGLE_ACCOUNT_LINKING_REQUIRED"
    );
  }

  const user = result.user;

  if (user.status !== "ACTIVE") {
    throw new AppError(
      "User account is not active",
      403,
      "ACCOUNT_NOT_ACTIVE"
    );
  }

  const sessionId = randomUUID();

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
    sessionId,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    sessionId,
  });

  await createSession({
    sessionId,
    userId: user.id,
    ip,
    userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.email_verified_at,
    },
    accessToken,
    refreshToken,
  };
}
async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new AppError(
      "Refresh token is required",
      401,
      "REFRESH_TOKEN_REQUIRED"
    );
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError(
        "Refresh token has expired",
        401,
        "REFRESH_TOKEN_EXPIRED"
      );
    }

    if (error.name === "JsonWebTokenError") {
      throw new AppError(
        "Invalid refresh token",
        401,
        "INVALID_REFRESH_TOKEN"
      );
    }

    throw error;
  }

  if (payload.type !== "refresh") {
    throw new AppError(
      "Invalid refresh token",
      401,
      "INVALID_REFRESH_TOKEN"
    );
  }

  const session = await getSession(payload.sessionId);

  if (!session) {
    throw new AppError(
      "Session is no longer valid",
      401,
      "SESSION_INVALID"
    );
  }

  const user = await findUserById(payload.userId);

  if (!user) {
    throw new AppError(
      "User account no longer exists",
      401,
      "USER_NOT_FOUND"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      "User account is not active",
      401,
      "ACCOUNT_NOT_ACTIVE"
    );
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
    sessionId: payload.sessionId,
  });

  return {
    accessToken,
  };
};
async function logout (sessionId) {
  if (!sessionId) {
    throw new AppError(
      "Session ID is required",
      401,
      "SESSION_ID_REQUIRED"
    );
  }

  await deleteSession(sessionId);
};
async function verifyEmail(token){
  if (!token) {
    throw new AppError(
      "Verification token is required",
      400,
      "VERIFICATION_TOKEN_REQUIRED"
    );
  }

  const userId = await getUserIdByVerificationToken(token);

  if (!userId) {
    throw new AppError(
      "Invalid or expired verification token",
      400,
      "INVALID_VERIFICATION_TOKEN"
    );
  }

  const user = await verifyUserEmail(userId);

  if (!user) {
    throw new AppError(
      "Email is already verified or user does not exist",
      400,
      "EMAIL_ALREADY_VERIFIED"
    );
  }

  await deleteVerificationToken(token);

  return {
    id: user.id,
    email: user.email,
    emailVerifiedAt: user.email_verified_at,
  };
};
const requestPasswordReset = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return null;
  }

  const resetToken = await createPasswordResetToken(user.id);

  return {
    resetToken,
  };
};
const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new AppError(
      "Reset token is required",
      400,
      "RESET_TOKEN_REQUIRED"
    );
  }

  const userId =
    await getUserIdByPasswordResetToken(token);

  if (!userId) {
    throw new AppError(
      "Invalid or expired password reset token",
      400,
      "INVALID_RESET_TOKEN"
    );
  }

  const user = await findUserById(userId);

  if (!user) {
    throw new AppError(
      "User account no longer exists",
      400,
      "USER_NOT_FOUND"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      "User account is not active",
      400,
      "ACCOUNT_NOT_ACTIVE"
    );
  }

  const passwordHash = await bcrypt.hash(
    newPassword,
    12
  );

  const updatedUser = await updateUserPassword(
    userId,
    passwordHash
  );

  if (!updatedUser) {
    throw new AppError(
      "Failed to update password",
      500,
      "PASSWORD_UPDATE_FAILED"
    );
  }

  await deletePasswordResetToken(token);
  await deleteAllUserSessions(userId);

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    passwordChangedAt: updatedUser.updated_at,
  };
};
async function validateAccessToken(token) {
  if (!token) {
    throw new AppError(
      "Access token is required",
      401,
      "ACCESS_TOKEN_REQUIRED"
    );
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      throw new AppError(
        "Invalid or expired access token",
        401,
        "INVALID_ACCESS_TOKEN"
      );
    }

    throw error;
  }

  if (
    payload.type !== "access" ||
    typeof payload.userId !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    throw new AppError(
      "Invalid access token",
      401,
      "INVALID_ACCESS_TOKEN"
    );
  }

  const session = await getSession(payload.sessionId);

  if (!session || session.userId !== payload.userId) {
    throw new AppError(
      "Session is no longer valid",
      401,
      "SESSION_INVALID"
    );
  }

  const user = await findUserById(payload.userId);

  if (!user) {
    throw new AppError(
      "User account no longer exists",
      401,
      "USER_NOT_FOUND"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      "User account is not active",
      401,
      "ACCOUNT_NOT_ACTIVE"
    );
  }

  return {
    userId: user.id,
    sessionId: payload.sessionId,
  };
}
module.exports = {
  register,
  login,
  loginWithGoogle,
  refreshAccessToken,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  validateAccessToken
};