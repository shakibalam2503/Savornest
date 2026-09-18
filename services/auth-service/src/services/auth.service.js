const bcrypt = require("bcryptjs");
const {randomUUID}=require("crypto")
const {createSession,getSession,deleteSession}=require("./session.service")
const {generateAccessToken,generateRefreshToken,verifyAccessToken,verifyRefreshToken}=require("./token.service")
const {
  findUserByEmail,
  createUser,
  findUserById
} = require("../repositories/user.repository");

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

  const user = await createUser({
    email: normalizedEmail,
    passwordHash,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    createdAt: user.created_at,
  };
};
async function login({email,password,ip,userAgent}) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await findUserByEmail(normalizedEmail);

  if(!user){
    throw new AppError("Invalid email or password",401,"INVALID_CREDENTIALS")
  }
  const retrivedPasswordHash = user.password_hash;
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
module.exports = {
  register,
  login,
  refreshAccessToken,
  logout
};