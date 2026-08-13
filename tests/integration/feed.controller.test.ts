import { getFeed } from "../../src/controllers/feed.controller";
import User from "../../src/models/User.model";
import Post from "../../src/models/Post.model";


jest.mock("../../src/models/User.model");
jest.mock("../../src/models/Post.model");

describe("Feed Controller", () => {
  let req: any;
  let res: any;

  const mockUserId = "507f1f77bcf86cd799439011";
  const mockFollowedUserId = "507f1f77bcf86cd799439022";

  beforeEach(() => {
    req = {
      userId: mockUserId,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("getFeed", () => {
    it("should return 404 if the authenticated user is not found", async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await getFeed(req, res);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found.",
      });
    });

    it("should return posts from the user and their followed accounts sorted by createdAt descending", async () => {
      const mockCurrentUser = {
        _id: mockUserId,
        following: [mockFollowedUserId],
      };

      const mockPosts = [
        {
          _id: "post_1",
          caption: "Post from followed user",
          owner: { name: "Jane", username: "jane_doe" },
          createdAt: new Date("2026-08-05T10:00:00Z"),
        },
        {
          _id: "post_2",
          caption: "Post from current user",
          owner: { name: "John", username: "john_doe" },
          createdAt: new Date("2026-08-04T10:00:00Z"),
        },
      ];

      (User.findById as jest.Mock).mockResolvedValue(mockCurrentUser);

 
      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockResolvedValue(mockPosts);

      (Post.find as jest.Mock).mockReturnValue({
        populate: mockPopulate,
        sort: mockSort,
      });

      await getFeed(req, res);

      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(Post.find).toHaveBeenCalledWith({
        owner: {
          $in: [mockFollowedUserId, mockUserId],
        },
      });
      expect(mockPopulate).toHaveBeenCalledWith(
        "owner",
        "name username profilePicture"
      );
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalPosts: 2,
        posts: mockPosts,
      });
    });

    it("should return 500 if an internal database error occurs", async () => {
      (User.findById as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      await getFeed(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });
  });
});