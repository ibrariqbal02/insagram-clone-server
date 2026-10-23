import { Request, Response } from "express";
import User from "../models/User.model";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import jwt from "jsonwebtoken";
// import uploadToCloud from "../utils/uploadToCloudinary";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail";
import Post from "../models/Post.model";
import Comment from "../models/Comment.model";
import Notification from "../models/Notification.model";
import deleteFromCloudinary from "../utils/deleteFromCloudinary";
import uploadToCloudinary from "../utils/uploadToCloudinary";
import {
  clearAuthCookies,
  hashToken,
  setAuthCookies,
  wantsTokensInBody,
} from "../utils/authTokens";

const MAX_OTP_ATTEMPTS = 5;

export const register = async (req: Request, res: Response) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email or Username already exists.",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
    });
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    user.refreshToken = hashToken(refreshToken);
    await user.save();
    setAuthCookies(res, accessToken, refreshToken);

    const userData = user.toObject();

    const { password: _, refreshToken: __, ...safeUser } = userData;
    return res.status(201).json({
      success: true,
      message: "user create successfully",
      user: safeUser,
      ...(wantsTokensInBody(req) && { accessToken, refreshToken }),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const user = await User.findOne({
      $or: [{ email: login }, { username: login }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid email/username or password.",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/username or password.",
      });
    }

    const accessToken = generateAccessToken(user._id.toString());

    const refreshToken = generateRefreshToken(user._id.toString());

    user.refreshToken = hashToken(refreshToken);

    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    const userObject = user.toObject();

    const { password: _, refreshToken: __, ...userData } = userObject;

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: userData,
      ...(wantsTokensInBody(req) && { accessToken, refreshToken }),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.refreshToken = "";

    await user.save();

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken: string | undefined =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found.",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: string };

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.refreshToken || user.refreshToken !== hashToken(refreshToken)) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    // Rotate: every refresh issues a new refresh token, so a stolen old one stops working.
    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    user.refreshToken = hashToken(newRefreshToken);
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      ...(wantsTokensInBody(req) && {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }),
    });
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Refresh Token.",
    });
  }
};
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Determine who is asking (token is optional on this route)
    const viewerId = (req as any).userId as string | undefined;
    const isOwner = viewerId && viewerId === userId;
    const isFollower =
      viewerId &&
      user.followers.some((id) => id.toString() === viewerId);
    const canSeeDetails = isOwner || isFollower || !user.isPrivate;

    if (!canSeeDetails) {
      // Return a stripped-down profile so the frontend can render the "private" state
      return res.status(200).json({
        success: true,
        isPrivate: true,
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          profilePicture: user.profilePicture,
          bio: "",
          isPrivate: true,
          followers: user.followers,   // counts are still public on Instagram; keep array for count
          following: user.following,
        },
      });
    }

    return res.status(200).json({
      success: true,
      isPrivate: false,
      user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// export const updateProfile = async (req: Request, res: Response) => {
//   try {
//     const { name, username, bio } = req.body;

//     const user = await User.findById(req.userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found.",
//       });
//     }

//     if (username && username !== user.username) {
//       const usernameExists = await User.findOne({ username });

//       if (usernameExists) {
//         return res.status(400).json({
//           success: false,
//           message: "Username already exists.",
//         });
//       }

//       user.username = username;
//     }

//     if (name) user.name = name;

//     if (bio) user.bio = bio;

//     if (req.file) {
//       const result = await uploadToCloud(req.file.path);

//       user.profilePicture = result.secure_url;
//     }

//     await user.save();

//     const updatedUser = await User.findById(user._id).select(
//       "-password -refreshToken"
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Profile updated successfully.",
//       user: updatedUser,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, username, bio } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username });

      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: "Username already exists.",
        });
      }

      user.username = username;
    }

    if (name) user.name = name;

    if (bio) user.bio = bio;

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        "profiles"
      );

      user.profilePicture = result.secure_url;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
};
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email });

    // Same answer whether or not the email exists, so attackers can't discover accounts.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully.",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.resetOTP = hashToken(otp);
    user.resetOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOTPAttempts = 0;

    await user.save();

    await sendEmail(
      email,
      "Password Reset OTP",
      `Your OTP is ${otp}. It will expire in 10 minutes.`
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.resetOTP || !user.resetOTPExpire || user.resetOTPExpire < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired.",
      });
    }

    if ((user.resetOTPAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many wrong attempts. Please request a new OTP.",
      });
    }

    if (user.resetOTP !== hashToken(String(otp))) {
      user.resetOTPAttempts = (user.resetOTPAttempts ?? 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    user.resetOTP = null;

    user.resetOTPExpire = null;

    user.resetOTPAttempts = 0;

    // Log out every device after a password reset.
    user.refreshToken = "";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Remove the user's posts and their Cloudinary images
    const posts = await Post.find({ owner: userId });

    for (const post of posts) {
      for (const image of post.images) {
        await deleteFromCloudinary(image.publicId).catch(() => {});
      }
    }

    await Post.deleteMany({ owner: userId });

    // Remove the user's comments and any notifications tied to them
    await Comment.deleteMany({ owner: userId });

    await Notification.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }],
    });

    // Detach the user from everyone else's followers/following lists
    await User.updateMany(
      {},
      { $pull: { followers: userId, following: userId } }
    );

    await User.findByIdAndDelete(userId);

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const updatePrivacy = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { isPrivate } = req.body;

    if (typeof isPrivate !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isPrivate must be a boolean",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isPrivate },
      { new: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: isPrivate ? "Profile is now private" : "Profile is now public",
      user,
    });
  } catch (error) {
    console.error("Privacy update error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
