import { Router } from "express";
import { getFeed, getReels } from "../controllers/feed.controller";
import isAuthenticated from "../middlewares/auth.middleware";

const feedRouter = Router();

feedRouter.get("/", isAuthenticated, getFeed);
feedRouter.get("/reels", isAuthenticated, getReels);

export default feedRouter;
