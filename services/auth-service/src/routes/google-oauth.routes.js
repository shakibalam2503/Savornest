const express = require("express");
const {initiateGoogleLogin,googleCallback} = require("../controllers/google-oauth.controller");

const router = express.Router();

router.get("/", initiateGoogleLogin);
router.get("/callback",googleCallback)

module.exports = router;