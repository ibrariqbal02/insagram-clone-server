import { Request, Response } from "express";
import User from "../models/User.model";
import Notification from "../models/Notification.model";

export const followUnfollowUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(userId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isFollowing = currentUser.following.some(
      (id) => id.toString() === userId
    );

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== userId
      ) as typeof currentUser.following;

      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== req.userId
      ) as typeof targetUser.followers;

      await currentUser.save();
      await targetUser.save();

      
      await Notification.findOneAndDelete({
        sender: req.userId,
        receiver: targetUser._id,
        type: "follow",
      });

      return res.status(200).json({
        success: true,
        message: "User unfollowed successfully.",
      });
    }

    currentUser.following.push(targetUser._id as typeof currentUser.following[number]);
    targetUser.followers.push(currentUser._id as typeof targetUser.followers[number]);

    await currentUser.save();
    await targetUser.save();

    await Notification.create({
      sender: req.userId,
      receiver: targetUser._id,
      type: "follow",
    });

    return res.status(200).json({
      success: true,
      message: "User followed successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getFollowers = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate(
      "followers",
      "name username profilePicture bio"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      totalFollowers: user.followers.length,
      followers: user.followers,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getFollowing = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate(
      "following",
      "name username profilePicture bio"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      totalFollowing: user.following.length,
      following: user.following,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const removeFollower = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const currentUser = await User.findById(req.userId);
    const follower = await User.findById(userId);

    if (!currentUser || !follower) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    currentUser.followers = currentUser.followers.filter(
      (id) => id.toString() !== userId
    ) as typeof currentUser.followers;

    follower.following = follower.following.filter(
      (id) => id.toString() !== req.userId
    ) as typeof follower.following;

    await currentUser.save();
    await follower.save();

    return res.status(200).json({
      success: true,
      message: "Follower removed successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
