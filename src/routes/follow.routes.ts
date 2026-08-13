import { Router } from "express";
import isAuthenticated from "../middlewares/auth.middleware";
import { followUnfollowUser, getFollowers, getFollowing, removeFollower } from "../controllers/follow.controller";

const followRouter = Router();

followRouter.put("/:userId", isAuthenticated, followUnfollowUser);
followRouter.get(
  "/followers/:userId",
  getFollowers
);

followRouter.get(
  "/following/:userId",
  getFollowing
);

followRouter.delete(
  "/remove/:userId",
  isAuthenticated,
  removeFollower
);

export default followRouter;
