import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from "../../src/controllers/notification.controller";
import Notification from "../../src/models/Notification.model";


jest.mock("../../src/models/Notification.model");

describe("Notification Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      params: {},
      userId: "user_123", // Authenticated user ID
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });


    //  1. getNotifications

  describe("getNotifications", () => {
    it("should return populated notifications for the logged-in user", async () => {
      const mockNotifications = [
        { _id: "notif_1", receiver: "user_123", isRead: false },
        { _id: "notif_2", receiver: "user_123", isRead: true },
      ];

   
      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockResolvedValue(mockNotifications);

      (Notification.find as jest.Mock).mockReturnValue({
        populate: mockPopulate,
        sort: mockSort,
      });

      await getNotifications(req, res);

      expect(Notification.find).toHaveBeenCalledWith({ receiver: "user_123" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalNotifications: 2,
        notifications: mockNotifications,
      });
    });

    it("should return 500 when an internal error occurs", async () => {
      (Notification.find as jest.Mock).mockImplementation(() => {
        throw new Error("Database error");
      });

      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });
  });


    //  2. markAsRead

  describe("markAsRead", () => {
    it("should return 404 if notification is not found or does not belong to user", async () => {
      req.params.notificationId = "notif_123";

      (Notification.findOne as jest.Mock).mockResolvedValue(null);

      await markAsRead(req, res);

      expect(Notification.findOne).toHaveBeenCalledWith({
        _id: "notif_123",
        receiver: "user_123",
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Notification not found.",
      });
    });

    it("should mark the notification as read successfully", async () => {
      req.params.notificationId = "notif_123";

      const mockNotification = {
        _id: "notif_123",
        receiver: "user_123",
        isRead: false,
        save: jest.fn().mockResolvedValue(true),
      };

      (Notification.findOne as jest.Mock).mockResolvedValue(mockNotification);

      await markAsRead(req, res);

      expect(mockNotification.isRead).toBe(true);
      expect(mockNotification.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Notification marked as read.",
      });
    });

    it("should return 500 when an error occurs during save", async () => {
      req.params.notificationId = "notif_123";

      (Notification.findOne as jest.Mock).mockRejectedValue(
        new Error("Database write error")
      );

      await markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });
  });


    //  3. deleteNotification

  describe("deleteNotification", () => {
    it("should return 404 if notification is not found to delete", async () => {
      req.params.notificationId = "notif_123";

      (Notification.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await deleteNotification(req, res);

      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
        _id: "notif_123",
        receiver: "user_123",
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Notification not found.",
      });
    });

    it("should delete notification successfully", async () => {
      req.params.notificationId = "notif_123";

      const mockDeletedNotification = {
        _id: "notif_123",
        receiver: "user_123",
      };

      (Notification.findOneAndDelete as jest.Mock).mockResolvedValue(
        mockDeletedNotification
      );

      await deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Notification deleted successfully.",
      });
    });

    it("should return 500 when deletion throws an error", async () => {
      req.params.notificationId = "notif_123";

      (Notification.findOneAndDelete as jest.Mock).mockRejectedValue(
        new Error("Database delete error")
      );

      await deleteNotification(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
      });
    });
  });
});