import { createComment, deleteComment, getComments } from "../../src/controllers/comment.controller";
import Comment from "../../src/models/Comment.model";
import Post from "../../src/models/Post.model";
import Notification from "../../src/models/Notification.model";

jest.mock("../../src/models/Comment.model");
jest.mock("../../src/models/Post.model");
jest.mock("../../src/models/Notification.model");

describe("Comment Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      params: { postId: "post_123", commentId: "comment_123" },
      body: {},
      userId: "user_123",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("createComment", () => {
    it("should return 400 if text is missing", async () => {
      req.body = {};

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if post does not exist", async () => {
      req.body = { text: "Nice post!" };
      (Post.findById as jest.Mock).mockResolvedValue(null);

      await createComment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should create a comment and send a notification", async () => {
      req.body = { text: "Nice post!" };
      const mockPost = { _id: "post_123", owner: "owner_456" };
      const mockComment = { _id: "comment_123", text: "Nice post!" };

      (Post.findById as jest.Mock).mockResolvedValue(mockPost);
      (Comment.create as jest.Mock).mockResolvedValue(mockComment);

      await createComment(req, res);

      expect(Comment.create).toHaveBeenCalledWith({
        post: "post_123",
        owner: "user_123",
        text: "Nice post!",
        parentComment: null,
      });
      expect(Notification.create).toHaveBeenCalledWith({
        sender: "user_123",
        receiver: "owner_456",
        post: "post_123",
        type: "comment",
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("deleteComment", () => {
    it("should return 403 if user is not authorized to delete", async () => {
      const mockComment = { _id: "comment_123", owner: "other_user" };
      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);

      await deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should delete comment if user is owner", async () => {
      const mockComment = { _id: "comment_123", owner: "user_123" };
      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);

      await deleteComment(req, res);

      expect(Comment.findByIdAndDelete).toHaveBeenCalledWith("comment_123");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});