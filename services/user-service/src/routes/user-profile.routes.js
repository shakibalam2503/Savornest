const express = require("express");
const authenticate = require("../middlewares/authenticate");

const userProfileController = require("../controllers/user-profile.controller");

const router = express.Router();

router.use(authenticate);

// Authentication middleware will be added before exposing these routes.
router.get("/me", userProfileController.getMyProfile);
router.post("/me", userProfileController.createMyProfile);
router.patch("/me", userProfileController.updateMyProfile);

module.exports = router;
