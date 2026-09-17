const bcrypt = require("bcryptjs");

const {
  findUserByEmail,
  createUser,
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

module.exports = {
  register,
  
};