import { Router } from "express";
import { getFeed } from "../controllers/feed.controller";
import isAuthenticated from "../middlewares/auth.middleware";

const feedRouter = Router();

feedRouter.get("/", isAuthenticated, getFeed);

export default feedRouter;