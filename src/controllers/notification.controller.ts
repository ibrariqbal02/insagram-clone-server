import { Request, Response } from "express";
import Notification from "../models/Notification.model";

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({
      receiver: req.userId,
    })
      .populate("sender", "name username profilePicture")
      .populate("post", "caption images")
      .populate("comment", "text")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      totalNotifications: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    // Ensure the notification belongs to the logged-in user
    const notification = await Notification.findOne({
      _id: notificationId,
      receiver: req.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    // Ensure the notification belongs to the logged-in user
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      receiver: req.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};