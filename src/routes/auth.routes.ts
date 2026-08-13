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

const router = Router();

router.post("/register", register);

router.post("/login", login);

router.post("/logout", isAuthenticated, logout);

router.post("/refresh-token", refreshToken);

router.get("/me", isAuthenticated, getMyProfile);
router.get("/profile/:userId", optionalAuth, getUserProfile);
router.put("/update-profile", isAuthenticated, upload.single("profilePicture"), updateProfile);
router.patch("/change-password", isAuthenticated, changePassword);
router.patch("/privacy", isAuthenticated, updatePrivacy);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password", resetPassword);
router.delete("/delete-account", isAuthenticated, deleteAccount);

export default router;
