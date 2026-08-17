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

    // New user with no follows — show public posts as a discovery feed so the
    // home page isn't empty. We do this regardless of whether they have their
    // own posts, so uploading a first post doesn't suddenly collapse the feed
    // to show only that single post.
    if (currentUser.following.length === 0) {
      const explorePosts = await Post.find({
        status: { $ne: "archived" },
        owner: { $ne: currentUser._id },   // exclude their own posts from explore
      })
        .populate({
          path: "owner",
          match: { isPrivate: false },      // public accounts only
          select: "name username profilePicture isPrivate",
        })
        .sort({ createdAt: -1 })
        .limit(30);

      // populate returns null for owner when the match fails (private account),
      // so filter those out
      const publicPosts = explorePosts.filter((p) => p.owner !== null);

      // Merge own posts (always visible) at the top, then explore posts
      const merged = [...posts, ...publicPosts].sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return res.status(200).json({
        success: true,
        isExplore: true,           // lets the frontend show a contextual label
        totalPosts: merged.length,
        posts: merged,
      });
    }

    return res.status(200).json({
      success: true,
      isExplore: false,
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

/** Return all public video posts, newest first, for the Reels feed. */
export const getReels = async (req: Request, res: Response) => {
  try {
    const reels = await Post.find({
      status: { $ne: "archived" },
      "video.url": { $exists: true, $ne: null },
    })
      .populate({
        path: "owner",
        match: { isPrivate: false },
        select: "name username profilePicture isPrivate",
      })
      .sort({ createdAt: -1 })
      .limit(50);

    // Filter out posts whose owner matched as private (populate returns null)
    const publicReels = reels.filter((p) => p.owner !== null);

    return res.status(200).json({
      success: true,
      totalReels: publicReels.length,
      reels: publicReels,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
