const { z } = require("zod");

const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(320),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
});
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(320),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must not exceed 128 characters"),
});
module.exports = {
  registerSchema,loginSchema
};