import {
  followUnfollowUser,
  getFollowers,
  getFollowing,
  removeFollower,
} from "../../src/controllers/follow.controller";
import User from "../../src/models/User.model";
import Notification from "../../src/models/Notification.model";


jest.mock("../../src/models/User.model");
jest.mock("../../src/models/Notification.model");

describe("Follow Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      params: {},
      userId: "user_123", // Authenticated user ID
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });


    //  1. followUnfollowUser

  describe("followUnfollowUser", () => {
    it("should return 400 if user tries to follow themselves", async () => {
      req.params.userId = "user_123";

      await followUnfollowUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You cannot follow yourself.",
      });
    });

    it("should return 404 if current or target user is not found", async () => {
      req.params.userId = "user_456";

      (User.findById as jest.Mock).mockResolvedValueOnce(null); 
      (User.findById as jest.Mock).mockResolvedValueOnce({}); 

      await followUnfollowUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found.",
      });
    });

    it("should unfollow user and remove notification if already following", async () => {
      req.params.userId = "user_456";

      const mockCurrentUser = {
        _id: "user_123",
        following: ["user_456"],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockTargetUser = {
        _id: "user_456",
        followers: ["user_123"],
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(mockCurrentUser)
        .mockResolvedValueOnce(mockTargetUser);

      await followUnfollowUser(req, res);

      expect(mockCurrentUser.following).not.toContain("user_456");
      expect(mockTargetUser.followers).not.toContain("user_123");
      expect(mockCurrentUser.save).toHaveBeenCalled();
      expect(mockTargetUser.save).toHaveBeenCalled();
      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
        sender: "user_123",
        receiver: "user_456",
        type: "follow",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User unfollowed successfully.",
      });
    });

    it("should handle internal server errors gracefully", async () => {
      req.params.userId = "user_456";
      (User.findById as jest.Mock).mockRejectedValue(new Error("Database error"));

      await followUnfollowUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });
  });


    //  2. getFollowers

  describe("getFollowers", () => {
    it("should return 404 if user is not found", async () => {
      req.params.userId = "user_123";

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await getFollowers(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found.",
      });
    });

    it("should return list of followers for valid user", async () => {
      req.params.userId = "user_123";
      const mockFollowers = [
        { name: "John", username: "john_d" },
        { name: "Jane", username: "jane_d" },
      ];

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: "user_123",
          followers: mockFollowers,
        }),
      });

      await getFollowers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalFollowers: 2,
        followers: mockFollowers,
      });
    });
  });


    //  3. getFollowing

  describe("getFollowing", () => {
    it("should return 404 if user is not found", async () => {
      req.params.userId = "user_123";

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await getFollowing(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return list of users followed by target user", async () => {
      req.params.userId = "user_123";
      const mockFollowing = [{ name: "Alex", username: "alex_99" }];

      (User.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: "user_123",
          following: mockFollowing,
        }),
      });

      await getFollowing(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalFollowing: 1,
        following: mockFollowing,
      });
    });
  });

    //  4. removeFollower
 
  describe("removeFollower", () => {
    it("should return 404 if current user or follower is not found", async () => {
      req.params.userId = "follower_123";

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({});

      await removeFollower(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found.",
      });
    });

    it("should successfully remove follower", async () => {
      req.params.userId = "follower_123";

      const mockCurrentUser = {
        _id: "user_123",
        followers: ["follower_123"],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockFollower = {
        _id: "follower_123",
        following: ["user_123"],
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(mockCurrentUser)
        .mockResolvedValueOnce(mockFollower);

      await removeFollower(req, res);

      expect(mockCurrentUser.followers).not.toContain("follower_123");
      expect(mockFollower.following).not.toContain("user_123");
      expect(mockCurrentUser.save).toHaveBeenCalled();
      expect(mockFollower.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Follower removed successfully.",
      });
    });
  });
});