import { Request, Response } from "express";
import Conversation from "../models/Conversation.model";
import Message from "../models/Message.model";
import Notification from "../models/Notification.model";
import uploadAudioToCloudinary from "../utils/uploadAudioToCloudinary";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string;
    const content = req.body?.content;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Message content is required.",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.userId,
      type: "text",
      content,
    });

    conversation.lastMessage = message._id as any;
    await conversation.save();

    const participants = conversation.participants as any[];

    const receiver = participants.find((id) => id.toString() !== req.userId);

    if (receiver) {
      await Notification.create({
        sender: req.userId,
        receiver,
        type: "message",
        conversation: conversationId,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: message,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "name username profilePicture")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      totalMessages: messages.length,
      messages,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const editMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required.",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized.",
      });
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    return res.status(200).json({
      success: true,
      message: "Message updated successfully.",
      data: message,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    // Only sender can delete message
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized.",
      });
    }

    await Message.findByIdAndDelete(messageId);

    // Check if this was the last message
    const conversation = await Conversation.findById(message.conversation);

    if (conversation) {
      const lastMessage = await Message.findOne({
        conversation: conversation._id,
      }).sort({ createdAt: -1 });

      conversation.lastMessage = lastMessage ? (lastMessage._id as any) : null;

      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const sendVoiceMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required.",
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    // Upload audio buffer to Cloudinary
    const uploadResult = await uploadAudioToCloudinary(req.file.buffer, "voice_messages");

    const message = new Message({
      conversation: conversationId,
      sender: req.userId,
      type: "voice",
      content: uploadResult.secure_url,
    });
    await message.save();

    conversation.lastMessage = message._id as any;
    await conversation.save();

    const participants = conversation.participants as any[];
    const receiver = participants.find((id: any) => id.toString() !== req.userId);

    if (receiver) {
      await Notification.create({
        sender: req.userId,
        receiver,
        type: "message",
        conversation: conversationId as string,
      });
    }

    await message.populate("sender", "name username profilePicture");

    return res.status(201).json({
      success: true,
      message: "Voice message sent successfully.",
      data: message,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
