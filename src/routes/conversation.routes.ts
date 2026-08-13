import { Router } from "express";
import isAuthenticated from "../middlewares/auth.middleware";
import {
  createConversation,
  createGroupConversation,
  getMyConversations,
} from "../controllers/conversation.controller";

const conversationRouter = Router();

conversationRouter.post("/", isAuthenticated, createConversation);
conversationRouter.post("/group", isAuthenticated, createGroupConversation);
conversationRouter.get("/", isAuthenticated, getMyConversations);

export default conversationRouter;
