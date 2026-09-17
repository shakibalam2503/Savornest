const express = require("express");

const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate");
const { registerSchema } = require("../validators/auth.validator");

const router = express.Router();

router.post("/register",validate(registerSchema),
 authController.register);

module.exports = router;