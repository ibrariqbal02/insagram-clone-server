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
  completeOnboarding,
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

const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const currentYear = new Date().getFullYear();

const onboardingRules = [
  body("nativeLanguages")
    .isArray({ min: 1 })
    .withMessage("At least one native language is required."),
  body("nativeLanguages.*").isString().trim().notEmpty(),
  body("learningLanguages")
    .isArray({ min: 1 })
    .withMessage("At least one learning language is required."),
  body("learningLanguages.*.code")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Each learning language needs a code."),
  body("learningLanguages.*.level")
    .isIn(LANGUAGE_LEVELS)
    .withMessage(`Level must be one of ${LANGUAGE_LEVELS.join(", ")}.`),
  body("country").optional().isString().trim().isLength({ max: 56 }),
  body("interests").optional().isArray(),
  body("interests.*").optional().isString().trim().isLength({ max: 40 }),
  body("birthYear")
    .optional({ values: "null" })
    .isInt({ min: 1900, max: currentYear })
    .withMessage("Enter a valid birth year.")
    .custom((value) => {
      if (currentYear - Number(value) < 18) {
        throw new Error("You must be at least 18 years old.");
      }
      return true;
    }),
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
router.patch("/onboarding", isAuthenticated, onboardingRules, completeOnboarding);
router.post("/forgot-password", otpLimiter, [email, handleValidation], forgotPassword);
router.patch("/reset-password", otpLimiter, resetRules, resetPassword);
router.delete("/delete-account", isAuthenticated, deleteAccount);

export default router;
