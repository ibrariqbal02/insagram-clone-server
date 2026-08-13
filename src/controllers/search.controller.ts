import { Request, Response } from "express";
import User from "../models/User.model";
import Post from "../models/Post.model";

export const searchUsers = async (
  req: Request,
  res: Response
) => {
  try {
    const keyword = req.query.keyword as string;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Keyword is required.",
      });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { username: { $regex: keyword, $options: "i" } },
      ],
    }).select("name username profilePicture bio");

    return res.status(200).json({
      success: true,
      totalUsers: users.length,
      users,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};




export const searchPosts = async (
  req: Request,
  res: Response
) => {
  try {
    const keyword = req.query.keyword as string;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Keyword is required.",
      });
    }

    const posts = await Post.find({
      caption: {
        $regex: keyword,
        $options: "i",
      },
    })
      .populate(
        "owner",
        "name username profilePicture"
      )
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