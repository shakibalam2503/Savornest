const express = require("express");

const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate");
const { registerSchema,loginSchema } = require("../validators/auth.validator");
const authenticate = require("../middlewares/auth.middleware");
const {loginRateLimiter,} = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/register",validate(registerSchema),authController.register);
router.post('/login',loginRateLimiter,validate(loginSchema),authController.login)
router.get("/me",authenticate,authController.me)
router.post("/refresh",authController.refresh)
router.post("/logout",authenticate,authController.logout);
router.get("/verify-email",authController.verifyEmail);


module.exports = router;