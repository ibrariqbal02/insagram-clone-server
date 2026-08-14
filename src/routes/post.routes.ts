import { Router } from "express";
import { archivePost, createPost, deletePost, getArchivedPosts, getMyPosts, getSinglePost, getUserPosts, likeUnlikePost, unarchivePost, updatePost } from "../controllers/post.controller";
import isAuthenticated from "../middlewares/auth.middleware";
import { optionalAuth } from "../middlewares/auth.middleware";
import upload from "../config/multer";

const postRoutes = Router();

postRoutes.post(
  "/create",
  isAuthenticated,
  upload.array("media", 5),
  createPost
);

postRoutes.get("/my-posts", isAuthenticated, getMyPosts);
postRoutes.get("/archived", isAuthenticated, getArchivedPosts);
postRoutes.get("/user/:userId", optionalAuth, getUserPosts);
postRoutes.get("/:postId", getSinglePost);
postRoutes.put(
  "/:postId",
  isAuthenticated,
  upload.array("media", 5),
  updatePost
);

postRoutes.delete(
  "/:postId",
  isAuthenticated,
  deletePost
);
postRoutes.put("/:postId/like", isAuthenticated, likeUnlikePost);
postRoutes.put(
  "/:postId/archive",
  isAuthenticated,
  archivePost
);
postRoutes.put(
  "/:postId/unarchive",
  isAuthenticated,
  unarchivePost
);
export default postRoutes;
