import { Request, Response } from "express";
import User from "../models/User.model";
import Post from "../models/Post.model";

export const getFeed = async (
  req: Request,
  res: Response
) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Build the candidate owner list: people the current user follows + themselves
    const candidateIds = [
      ...currentUser.following,
      currentUser._id,
    ];

    // Filter out private accounts whose follower list does NOT include the current user.
    // Own posts always pass (currentUser._id is never private-gated for themselves).
    const visibleOwners = await User.find({
      _id: { $in: candidateIds },
      $or: [
        { isPrivate: false },
        { _id: currentUser._id },              // always see own posts
        { followers: currentUser._id },        // private but viewer is a follower
      ],
    }).select("_id");

    const visibleOwnerIds = visibleOwners.map((u) => u._id);

    const posts = await Post.find({
      owner: { $in: visibleOwnerIds },
      status: { $ne: "archived" },
    })
      .populate("owner", "name username profilePicture isPrivate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      totalPosts: posts.length,
      posts,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};