import { Router } from "express";
import isAuthenticated from "../middlewares/auth.middleware";
import {
  deleteMessage,
  editMessage,
  getMessages,
  sendMessage,
} from "../controllers/message.controller";

const messageRouter = Router();

messageRouter.post("/:conversationId", isAuthenticated, sendMessage);
messageRouter.get("/:conversationId", isAuthenticated, getMessages);
messageRouter.patch("/:messageId", isAuthenticated, editMessage);
messageRouter.delete("/:messageId", isAuthenticated, deleteMessage);

export default messageRouter;
