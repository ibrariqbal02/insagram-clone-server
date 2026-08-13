import { Request, Response } from "express";
import Conversation from "../models/Conversation.model";

export const createConversation = async (req: Request, res: Response) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver is required.",
      });
    }

    if (receiverId === req.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot chat with yourself.",
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.userId, receiverId],
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const createGroupConversation = async (req: Request, res: Response) => {
  try {
    const { participantIds, groupName } = req.body;

    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "A group chat requires at least 2 other participants.",
      });
    }

    if (!groupName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required.",
      });
    }

    // De-duplicate and always include the creator
    const members = [...new Set([req.userId, ...participantIds])];

    const conversation = await Conversation.create({
      participants: members,
      isGroup: true,
      groupName: groupName.trim(),
    });

    const populated = await conversation.populate(
      "participants",
      "name username profilePicture"
    );

    return res.status(201).json({
      success: true,
      conversation: populated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getMyConversations = async (req: Request, res: Response) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
    })
      .populate("participants", "name username profilePicture")
      .populate("lastMessage", "content createdAt sender")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      totalConversations: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
