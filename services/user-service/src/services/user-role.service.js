const userRoleRepository = require("../repositories/user-role.repository");
const AppError = require("../errors/AppError");

const ALLOWED_ROLES = ["CUSTOMER", "PROVIDER", "RIDER", "ADMIN"];

async function getRole(userId) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "USER_ID_REQUIRED");
  }

  const userRole = await userRoleRepository.findRoleByUserId(userId);

  if (!userRole) {
    throw new AppError("User role not found", 404, "USER_ROLE_NOT_FOUND");
  }

  return userRole;
}

async function createRole(userId, role = "CUSTOMER") {
  if (!userId) {
    throw new AppError("User ID is required", 400, "USER_ID_REQUIRED");
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new AppError("Invalid user role", 400, "INVALID_USER_ROLE");
  }

  return userRoleRepository.createRole(userId, role);
}

async function updateRole(userId, role) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "USER_ID_REQUIRED");
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new AppError("Invalid user role", 400, "INVALID_USER_ROLE");
  }

  const existingRole = await userRoleRepository.findRoleByUserId(userId);

  if (!existingRole) {
    throw new AppError("User role not found", 404, "USER_ROLE_NOT_FOUND");
  }

  return userRoleRepository.updateRole(userId, role);
}

module.exports = {
  getRole,
  createRole,
  updateRole,
};