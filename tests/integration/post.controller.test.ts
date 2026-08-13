import {
  createPost,
  getMyPosts,
  getUserPosts,
  getSinglePost,
  updatePost,
  deletePost,
  likeUnlikePost,
} from "../../src/controllers/post.controller";
import Post from "../../src/models/Post.model";
import Notification from "../../src/models/Notification.model";
import uploadToCloudinary from "../../src/utils/uploadToCloudinary";
import deleteFromCloudinary from "../../src/utils/deleteFromCloudinary";
import fs from "node:fs/promises";
import mongoose from "mongoose";

// Mock dependencies
jest.mock("../../src/models/Post.model");
jest.mock("../../src/models/Notification.model");
jest.mock("../../src/utils/uploadToCloudinary");
jest.mock("../../src/utils/deleteFromCloudinary");
jest.mock("node:fs/promises");

describe("Post Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      files: [],
      userId: "user_123", 
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

 
    //  1. createPost

  describe("createPost", () => {
    it("should return 400 if no files are uploaded", async () => {
      req.files = [];

      await createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Please upload at least one image.",
      });
    });

    it("should upload files to Cloudinary, remove temp files, and create a post", async () => {
      req.body = { caption: "My first post" };
      req.files = [
        { path: "/tmp/file1.jpg" },
        { path: "/tmp/file2.jpg" },
      ] as any;

      (uploadToCloudinary as jest.Mock)
        .mockResolvedValueOnce({
          secure_url: "http://cloudinary.com/img1.jpg",
          public_id: "img1_id",
        })
        .mockResolvedValueOnce({
          secure_url: "http://cloudinary.com/img2.jpg",
          public_id: "img2_id",
        });

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const mockCreatedPost = {
        _id: "post_123",
        owner: "user_123",
        caption: "My first post",
        images: [
          { url: "http://cloudinary.com/img1.jpg", publicId: "img1_id" },
          { url: "http://cloudinary.com/img2.jpg", publicId: "img2_id" },
        ],
      };

      (Post.create as jest.Mock).mockResolvedValue(mockCreatedPost);

      await createPost(req, res);

      expect(uploadToCloudinary).toHaveBeenCalledTimes(2);
      expect(fs.unlink).toHaveBeenCalledTimes(2);
      expect(Post.create).toHaveBeenCalledWith({
        owner: "user_123",
        caption: "My first post",
        images: [
          { url: "http://cloudinary.com/img1.jpg", publicId: "img1_id" },
          { url: "http://cloudinary.com/img2.jpg", publicId: "img2_id" },
        ],
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Post created successfully.",
        post: mockCreatedPost,
      });
    });
  });


    //  2. getMyPosts

  describe("getMyPosts", () => {
    it("should return all posts belonging to the logged-in user", async () => {
      const mockPosts = [
        { _id: "post_1", caption: "Post 1" },
        { _id: "post_2", caption: "Post 2" },
      ];

      (Post.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockPosts),
        }),
      });

      await getMyPosts(req, res);

      expect(Post.find).toHaveBeenCalledWith({ owner: "user_123" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalPosts: 2,
        posts: mockPosts,
      });
    });
  });


    //  3. getUserPosts

  describe("getUserPosts", () => {
    it("should return posts for a specific target user ID", async () => {
      req.params.userId = "user_target";
      const mockPosts = [{ _id: "post_1", caption: "Target post" }];

      (Post.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockPosts),
        }),
      });

      await getUserPosts(req, res);

      expect(Post.find).toHaveBeenCalledWith({ owner: "user_target" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalPosts: 1,
        posts: mockPosts,
      });
    });
  });

 
    //  4. getSinglePost

  describe("getSinglePost", () => {
    it("should return 404 if post is not found", async () => {
      req.params.postId = "post_123";

      (Post.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await getSinglePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Post not found.",
      });
    });

    it("should return post details if found", async () => {
      req.params.postId = "post_123";
      const mockPost = { _id: "post_123", caption: "Single post" };

      (Post.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockPost),
      });

      await getSinglePost(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        post: mockPost,
      });
    });
  });

  
    //  5. updatePost

  describe("updatePost", () => {
    it("should return 404 if post is not found", async () => {
      req.params.postId = "post_123";
      (Post.findById as jest.Mock).mockResolvedValue(null);

      await updatePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 403 if user is not authorized to edit", async () => {
      req.params.postId = "post_123";
      const mockPost = { owner: "other_user" };
      (Post.findById as jest.Mock).mockResolvedValue(mockPost);

      await updatePost(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You are not authorized.",
      });
    });

    it("should update caption and replace images if files provided", async () => {
      req.params.postId = "post_123";
      req.body = { caption: "Updated caption" };
      req.files = [{ path: "/tmp/new_file.jpg" }] as any;

      const mockPost = {
        _id: "post_123",
        owner: "user_123",
        caption: "Old caption",
        images: [{ url: "http://old.jpg", publicId: "old_id" }],
        save: jest.fn().mockResolvedValue(true),
      };

      (Post.findById as jest.Mock).mockResolvedValue(mockPost);
      (deleteFromCloudinary as jest.Mock).mockResolvedValue(true);
      (uploadToCloudinary as jest.Mock).mockResolvedValue({
        secure_url: "http://new.jpg",
        public_id: "new_id",
      });
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await updatePost(req, res);

      expect(deleteFromCloudinary).toHaveBeenCalledWith("old_id");
      expect(uploadToCloudinary).toHaveBeenCalledWith("/tmp/new_file.jpg", "posts");
      expect(mockPost.caption).toBe("Updated caption");
      expect(mockPost.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });


    //  6. deletePost

  describe("deletePost", () => {
    it("should delete all images from Cloudinary and remove post from DB", async () => {
      req.params.postId = "post_123";

      const mockPost = {
        _id: "post_123",
        owner: "user_123",
        images: [
          { publicId: "img1" },
          { publicId: "img2" },
        ],
      };

      (Post.findById as jest.Mock).mockResolvedValue(mockPost);

      await deletePost(req, res);

      expect(deleteFromCloudinary).toHaveBeenCalledTimes(2);
      expect(deleteFromCloudinary).toHaveBeenCalledWith("img1");
      expect(deleteFromCloudinary).toHaveBeenCalledWith("img2");
      expect(Post.findByIdAndDelete).toHaveBeenCalledWith("post_123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Post deleted successfully.",
      });
    });
  });

  
    //  7. likeUnlikePost
describe("likeUnlikePost", () => {
  // Use a valid 24-character hex ID so Mongoose ObjectId casting works
  const validUserId = "507f1f77bcf86cd799439011";

  it("should return 401 if req.userId is missing", async () => {
    req.userId = undefined;

    await likeUnlikePost(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should unlike post and remove notification if already liked", async () => {
    req.userId = validUserId;
    req.params.postId = "post_123";

    const mockPost = {
      _id: "post_123",
      owner: "user_owner",
      likes: [validUserId],
    };

    (Post.findById as jest.Mock).mockResolvedValue(mockPost);

    await likeUnlikePost(req, res);

    expect(Post.findByIdAndUpdate).toHaveBeenCalledWith("post_123", {
      $pull: { likes: validUserId },
    });
    expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
      sender: validUserId,
      receiver: "user_owner",
      post: "post_123",
      type: "like",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Post unliked successfully.",
    });
  });

  it("should like post and create notification if not already liked", async () => {
    req.userId = validUserId;
    req.params.postId = "post_123";

    const mockPost = {
      _id: "post_123",
      owner: "user_owner",
      likes: [],
      save: jest.fn().mockResolvedValue(true),
    };

    (Post.findById as jest.Mock).mockResolvedValue(mockPost);

    await likeUnlikePost(req, res);

    expect(mockPost.likes).toContainEqual(new mongoose.Types.ObjectId(validUserId));
    expect(mockPost.save).toHaveBeenCalled();
    expect(Notification.create).toHaveBeenCalledWith({
      sender: validUserId,
      receiver: "user_owner",
      post: "post_123",
      type: "like",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Post liked successfully.",
    });
  });
});
});