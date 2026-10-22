const userProfileRepository = require("../repositories/user-profile.repository.js");
const AppError = require("../errors/AppError");

async function getProfile(userId) {
  const profile = await userProfileRepository.findProfileByUserId(userId);

  if (!profile) {
    throw new AppError("User profile not found", 404, "PROFILE_NOT_FOUND");
  }

  return profile;
}

async function createProfile({ userId, fullName = null, phone = null, avatarUrl = null }) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "USER_ID_REQUIRED");
  }

  return userProfileRepository.createProfile({
    userId,
    fullName,
    phone,
    avatarUrl,
  });
}

async function updateProfile(userId, updates) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "USER_ID_REQUIRED");
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new AppError("At least one profile field is required", 400, "EMPTY_UPDATE");
  }

  const allowedFields = ["fullName", "phone", "avatarUrl"];
  const hasAllowedField = Object.keys(updates).some((field) =>
    allowedFields.includes(field)
  );

  if (!hasAllowedField) {
    throw new AppError("No valid profile fields provided", 400, "INVALID_PROFILE_FIELDS");
  }

  const profile = await userProfileRepository.updateProfile(userId, updates);

  if (!profile) {
    throw new AppError("User profile not found", 404, "PROFILE_NOT_FOUND");
  }

  return profile;
}

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
};