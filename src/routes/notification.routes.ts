import { Router } from "express";
import isAuthenticated from "../middlewares/auth.middleware";
import { deleteNotification, getNotifications, markAsRead } from "../controllers/notification.controller";



const notificationRourer = Router()
notificationRourer.get(
  "/",
  isAuthenticated,
  getNotifications
);

notificationRourer.put(
  "/:notificationId/read",
  isAuthenticated,
  markAsRead
);

notificationRourer.delete(
  "/:notificationId",
  isAuthenticated,
  deleteNotification
);
export default notificationRourer