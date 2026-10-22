const userProfileService = require("../services/user-profile.service");

async function getMyProfile(req, res, next) {
  try {
    const profile = await userProfileService.getProfile(req.user.userId);

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

async function createMyProfile(req, res, next) {
  try {
    const profile = await userProfileService.createProfile({
      userId: req.user.userId,
      fullName: req.body.fullName,
      phone: req.body.phone,
      avatarUrl: req.body.avatarUrl,
    });

    return res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const profile = await userProfileService.updateProfile(
      req.user.userId,
      {
        fullName: req.body.fullName,
        phone: req.body.phone,
        avatarUrl: req.body.avatarUrl,
      }
    );

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
};