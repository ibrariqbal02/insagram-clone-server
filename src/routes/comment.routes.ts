import isAuthenticated from "../middlewares/auth.middleware";
import { createComment, deleteComment, getComments, likeUnlikeComment, updateComment } from "../controllers/comment.controller";
import { Router } from "express";

const commentRoutes = Router();

commentRoutes.get("/:postId", getComments);
commentRoutes.post("/:postId", isAuthenticated, createComment);
commentRoutes.put(
  "/:commentId",
  isAuthenticated,
  updateComment
);
commentRoutes.delete(
  "/:commentId",
  isAuthenticated,
  deleteComment
);

commentRoutes.put(
  "/:commentId/like",
  isAuthenticated,
  likeUnlikeComment
);

export default commentRoutes;
