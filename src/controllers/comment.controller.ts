import { Request, Response } from "express";
import Post from "../models/Post.model";
import Comment from "../models/Comment.model";
import Notification from "../models/Notification.model";

export const getComments = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;

    const comments = await Comment.find({ post: postId })
      .populate("owner", "name username profilePicture")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      totalComments: comments.length,
      comments,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const { text, parentComment } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Comment is required.",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    let parent = null;

    if (parentComment) {
      parent = await Comment.findOne({ _id: parentComment, post: postId });

      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Comment being replied to was not found.",
        });
      }
    }

    const comment = await Comment.create({
      post: postId,
      owner: req.userId,
      text,
      parentComment: parent ? parent._id : null,
    });

    if (parent) {
      // Replying to a comment — notify the comment's author, not the post owner
      if (parent.owner.toString() !== req.userId) {
        await Notification.create({
          sender: req.userId,
          receiver: parent.owner,
          post: post._id,
          comment: parent._id,
          type: "reply",
        });
      }
    } else if (post.owner.toString() !== req.userId) {
      // Don't notify yourself
      await Notification.create({
        sender: req.userId,
        receiver: post.owner,
        post: post._id,
        type: "comment",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Comment is required.",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    if (comment.owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized.",
      });
    }

    comment.text = text;

    await comment.save();

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully.",
      comment,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    if (comment.owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized.",
      });
    }

    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const likeUnlikeComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const alreadyLiked = comment.likes.some(
      (id) => id.toString() === req.userId
    );

    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== req.userId
      ) as typeof comment.likes;

      await comment.save();

      await Notification.findOneAndDelete({
        sender: req.userId,
        receiver: comment.owner,
        comment: comment._id,
        type: "like",
      });

      return res.status(200).json({
        success: true,
        message: "Comment unliked successfully.",
      });
    }

    comment.likes.push(req.userId as any);

    await comment.save();

    if (comment.owner.toString() !== req.userId) {
      await Notification.create({
        sender: req.userId,
        receiver: comment.owner,
        post: comment.post,
        comment: comment._id,
        type: "like",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment liked successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
