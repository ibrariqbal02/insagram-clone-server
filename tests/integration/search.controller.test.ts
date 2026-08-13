import { searchUsers, searchPosts } from "../../src/controllers/search.controller";
import User from "../../src/models/User.model";
import Post from "../../src/models/Post.model";

// Mock Mongoose models
jest.mock("../../src/models/User.model");
jest.mock("../../src/models/Post.model");

describe("Search Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });


    //  1. searchUsers

  describe("searchUsers", () => {
    it("should return 400 if keyword query parameter is missing", async () => {
      req.query = {};

      await searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Keyword is required.",
      });
    });

    it("should search users by name or username with case-insensitive regex", async () => {
      req.query = { keyword: "john" };

      const mockUsers = [
        { name: "John Doe", username: "johndoe", profilePicture: "pic.jpg", bio: "Hello" },
      ];

      const mockSelect = jest.fn().mockResolvedValue(mockUsers);
      (User.find as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      await searchUsers(req, res);

      expect(User.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: "john", $options: "i" } },
          { username: { $regex: "john", $options: "i" } },
        ],
      });
      expect(mockSelect).toHaveBeenCalledWith("name username profilePicture bio");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalUsers: 1,
        users: mockUsers,
      });
    });

    it("should return 500 when an error occurs", async () => {
      req.query = { keyword: "john" };
      (User.find as jest.Mock).mockImplementation(() => {
        throw new Error("Database error");
      });

      await searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });
  });


    //  2. searchPosts
  
  describe("searchPosts", () => {
    it("should return 400 if keyword query parameter is missing", async () => {
      req.query = {};

      await searchPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Keyword is required.",
      });
    });

    it("should search posts by caption with case-insensitive regex and return populated results", async () => {
      req.query = { keyword: "vacation" };

      const mockPosts = [
        {
          _id: "post_1",
          caption: "Summer vacation!",
          owner: { name: "John", username: "johndoe", profilePicture: "pic.jpg" },
        },
      ];

  
      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockResolvedValue(mockPosts);

      (Post.find as jest.Mock).mockReturnValue({
        populate: mockPopulate,
        sort: mockSort,
      });

      await searchPosts(req, res);

      expect(Post.find).toHaveBeenCalledWith({
        caption: {
          $regex: "vacation",
          $options: "i",
        },
      });
      expect(mockPopulate).toHaveBeenCalledWith("owner", "name username profilePicture");
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalPosts: 1,
        posts: mockPosts,
      });
    });

    it("should return 500 when a database error occurs", async () => {
      req.query = { keyword: "vacation" };
      (Post.find as jest.Mock).mockImplementation(() => {
        throw new Error("Database query error");
      });

      await searchPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });
  });
});