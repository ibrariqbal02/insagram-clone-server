import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getMyProfile,
  getUserProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  updatePrivacy,
} from "../controllers/auth.controller";
import isAuthenticated from "../middlewares/auth.middleware";
import { optionalAuth } from "../middlewares/auth.middleware";
import upload from "../config/multer";
import { body } from "express-validator";
import {
  authLimiter,
  handleValidation,
  otpLimiter,
} from "../middlewares/security.middleware";

const router = Router();

const password = (field: string) =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8 to 128 characters.");

const email = body("email")
  .isString()
  .trim()
  .isEmail()
  .withMessage("A valid email is required.")
  .toLowerCase();

const registerRules = [
  body("name").isString().trim().isLength({ min: 1, max: 50 }).withMessage("Name is required (max 50 characters)."),
  body("username")
    .isString()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9._]{3,30}$/)
    .withMessage("Username must be 3 to 30 characters: letters, numbers, dots or underscores."),
  email,
  password("password"),
  handleValidation,
];

const loginRules = [
  body("login").isString().trim().notEmpty().withMessage("All fields are required."),
  body("password").isString().notEmpty().withMessage("All fields are required."),
  handleValidation,
];

const resetRules = [
  email,
  body("otp").isString().trim().matches(/^\d{6}$/).withMessage("OTP must be 6 digits."),
  password("newPassword"),
  handleValidation,
];

router.post("/register", authLimiter, registerRules, register);

router.post("/login", authLimiter, loginRules, login);

router.post("/logout", isAuthenticated, logout);

router.post("/refresh-token", refreshToken);

router.get("/me", isAuthenticated, getMyProfile);
router.get("/profile/:userId", optionalAuth, getUserProfile);
router.put("/update-profile", isAuthenticated, upload.single("profilePicture"), updateProfile);
router.patch(
  "/change-password",
  isAuthenticated,
  [body("currentPassword").isString().notEmpty().withMessage("All fields are required."), password("newPassword"), handleValidation],
  changePassword
);
router.patch("/privacy", isAuthenticated, updatePrivacy);
router.post("/forgot-password", otpLimiter, [email, handleValidation], forgotPassword);
router.patch("/reset-password", otpLimiter, resetRules, resetPassword);
router.delete("/delete-account", isAuthenticated, deleteAccount);

export default router;
