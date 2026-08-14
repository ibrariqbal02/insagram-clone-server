import { Request, Response } from "express";
import uploadToCloudinary from "../utils/uploadToCloudinary";
import uploadVideoToCloudinary from "../utils/uploadVideoToCloudinary";
import Post from "../models/Post.model";
import deleteFromCloudinary from "../utils/deleteFromCloudinary";
import Notification from "../models/Notification.model";
import mongoose from "mongoose";
import { ALLOWED_VIDEO_TYPES } from "../config/multer";

const isVideoFile = (mimetype: string) => ALLOWED_VIDEO_TYPES.includes(mimetype);
// import fs from "node:fs/promises";

// export const createPost = async (req: Request, res: Response) => {
//   try {
//     const { caption } = req.body;

//     const files = req.files as Express.Multer.File[];

//     if (!files || files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Please upload at least one image.",
//       });
//     }

//     const images: { url: string; publicId: string }[] = [];

//     for (const file of files) {
//       try {
//         const result = await uploadToCloudinary(file.path, "posts");

//         images.push({
//           url: result.secure_url,
//           publicId: result.public_id,
//         });
//       } finally {
//         await fs.unlink(file.path).catch(() => {});
//       }
//     }

//     const post = await Post.create({
//       owner: req.userId,
//       caption,
//       images,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Post created successfully.",
//       post,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: error instanceof Error ? error.message : "Internal Server Error",
//     });
//   }
// };


export const createPost = async (req: Request, res: Response) => {
  try {
    const { caption } = req.body;

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image or video.",
      });
    }

    // Separate image and video files
    const imageFiles = files.filter((f) => !isVideoFile(f.mimetype));
    const videoFiles = files.filter((f) => isVideoFile(f.mimetype));

    if (videoFiles.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Only one video per post is allowed.",
      });
    }

    if (videoFiles.length > 0 && imageFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: "A post can contain either images or a video, not both.",
      });
    }

    const images: { url: string; publicId: string }[] = [];
    let video: { url: string; publicId: string } | undefined;

    for (const file of imageFiles) {
      try {
        const result = await uploadToCloudinary(file.buffer, "posts");
        images.push({ url: result.secure_url, publicId: result.public_id });
      } catch (error) {
        console.error("Cloudinary image upload error:", error);
        throw error;
      }
    }

    if (videoFiles.length === 1) {
      try {
        const result = await uploadVideoToCloudinary(videoFiles[0].buffer, "posts");
        video = { url: result.secure_url, publicId: result.public_id };
      } catch (error) {
        console.error("Cloudinary video upload error:", error);
        throw error;
      }
    }

    const post = await Post.create({
      owner: req.userId,
      caption,
      images,
      ...(video && { video }),
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      post,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};
export const getMyPosts = async (
  req: Request,
  res: Response
) => {
  try {
    const posts = await Post.find({
      owner: req.userId,
      status: { $ne: "archived" },
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
export const getUserPosts = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;

    // Check if the target account is private
    const targetUser = await (await import("../models/User.model")).default.findById(userId).select("isPrivate followers");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Viewing own posts is always allowed
    const viewerId = req.userId;
    const isOwner = viewerId && viewerId === userId;

    if (targetUser.isPrivate && !isOwner) {
      // Allow only if the viewer is an approved follower
      const isFollower =
        viewerId &&
        targetUser.followers.some(
          (id) => id.toString() === viewerId
        );

      if (!isFollower) {
        return res.status(200).json({
          success: true,
          isPrivate: true,
          totalPosts: 0,
          posts: [],
        });
      }
    }

    const posts = await Post.find({
      owner: userId,
      status: { $ne: "archived" },
    })
      .populate(
        "owner",
        "name username profilePicture"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      isPrivate: false,
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

export const getSinglePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).populate(
      "owner",
      "name username profilePicture"
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// export const updatePost = async (req: Request, res: Response) => {
//   try {
//     const { postId } = req.params;
//     const { caption } = req.body;

//     const files = req.files as Express.Multer.File[];

//     const post = await Post.findById(postId);

//     if (!post) {
//       return res.status(404).json({
//         success: false,
//         message: "Post not found.",
//       });
//     }

//     if (post.owner.toString() !== req.userId) {
//       return res.status(403).json({
//         success: false,
//         message: "You are not authorized.",
//       });
//     }

//     if (caption) {
//       post.caption = caption;
//     }

//     if (files && files.length > 0) {
//       for (const image of post.images) {
//         await deleteFromCloudinary(image.publicId);
//       }

//       const newImages = [];

//       for (const file of files) {
//         try {
//           const result = await uploadToCloudinary(file.buffer, "posts");

//           newImages.push({
//             url: result.secure_url,
//             publicId: result.public_id,
//           });
//         } finally {
//           await fs.unlink(file.path).catch(() => {});
//         }
//       }

//       post.images = newImages as typeof post.images;
//     }

//     await post.save();

//     return res.status(200).json({
//       success: true,
//       message: "Post updated successfully.",
//       post,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };
export const updatePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { caption } = req.body;

    const files = req.files as Express.Multer.File[];

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (post.owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized.",
      });
    }

    if (caption) {
      post.caption = caption;
    }

    if (files && files.length > 0) {
      const imageFiles = files.filter((f) => !isVideoFile(f.mimetype));
      const videoFiles = files.filter((f) => isVideoFile(f.mimetype));

      // Delete old images
      for (const image of post.images) {
        await deleteFromCloudinary(image.publicId);
      }

      // Delete old video if replacing
      if (post.video?.publicId) {
        await deleteFromCloudinary(post.video.publicId);
        post.video = undefined;
      }

      const newImages: { url: string; publicId: string }[] = [];

      for (const file of imageFiles) {
        const result = await uploadToCloudinary(file.buffer, "posts");
        newImages.push({ url: result.secure_url, publicId: result.public_id });
      }

      post.images = newImages as typeof post.images;

      if (videoFiles.length === 1) {
        const result = await uploadVideoToCloudinary(videoFiles[0].buffer, "posts");
        post.video = { url: result.secure_url, publicId: result.public_id } as typeof post.video;
      }
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      post,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const deletePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (post.owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized.",
      });
    }

    for (const image of post.images) {
      await deleteFromCloudinary(image.publicId);
    }

    if (post.video?.publicId) {
      await deleteFromCloudinary(post.video.publicId);
    }

    await Post.findByIdAndDelete(postId);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const likeUnlikePost = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const alreadyLiked = post.likes.some((id) => id.toString() === req.userId);

    if (alreadyLiked) {
      await Post.findByIdAndUpdate(postId, {
        $pull: { likes: req.userId },
      });
      await Notification.findOneAndDelete({
        sender: req.userId,
        receiver: post.owner,
        post: post._id,
        type: "like",
      });
      return res.status(200).json({
        success: true,
        message: "Post unliked successfully.",
      });
    }

    post.likes.push(new mongoose.Types.ObjectId(req.userId));

    await post.save();

    if (post.owner.toString() !== req.userId) {
      const notifi = await Notification.create({
        sender: req.userId,
        receiver: post.owner,
        post: post._id,
        type: "like",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post liked successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const archivePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (post.owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to archive this post.",
      });
    }

    if (post.status === "archived") {
      return res.status(400).json({
        success: false,
        message: "Post is already archived.",
      });
    }

    post.status = "archived";

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post archived successfully.",
      post,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const unarchivePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (post.owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to unarchive this post.",
      });
    }

    if (post.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Post is already active.",
      });
    }

    post.status = "active";

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post unarchived successfully.",
      post,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const getArchivedPosts = async (req: Request, res: Response) => {
  try {
    const posts = await Post.find({
      owner: req.userId,
      status: "archived",
    })
      .populate("owner", "name username profilePicture")
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
