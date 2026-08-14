import { Router } from "express";
import isAuthenticated from "../middlewares/auth.middleware";
import {
  deleteMessage,
  editMessage,
  getMessages,
  sendMessage,
  sendVoiceMessage,
} from "../controllers/message.controller";
import uploadAudio from "../config/multerAudio";

const messageRouter = Router();

messageRouter.post("/:conversationId", isAuthenticated, sendMessage);
messageRouter.post(
  "/:conversationId/voice",
  isAuthenticated,
  uploadAudio.single("audio"),
  sendVoiceMessage
);
messageRouter.get("/:conversationId", isAuthenticated, getMessages);
messageRouter.patch("/:messageId", isAuthenticated, editMessage);
messageRouter.delete("/:messageId", isAuthenticated, deleteMessage);

export default messageRouter;
