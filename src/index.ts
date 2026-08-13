import express, { Application, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import connectMongoose from "./config/database";

import cookieParser from "cookie-parser";
import multer from "multer";
import router from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/comment.routes";
import followRouter from "./routes/follow.routes";
import feedRouter from "./routes/feed.routes";
import searchRouter from "./routes/search.routes";
import notificationRourer from "./routes/notification.routes";
import conversationRouter from "./routes/conversation.routes";
import messageRouter from "./routes/message.routes";
import cors from "cors";
const app: Application = express();

const PORT: number = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://insagram-clone-client.vercel.app",
  "https://instagram-clone-client.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.set("trust proxy", 1);
// middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
//  Routes

app.use("/api/auth", router);
app.use("/api/post", postRoutes);
app.use("/api/comment", commentRoutes);
app.use("/api/follow", followRouter);
app.use("/api/feed", feedRouter);
app.use("/api/search", searchRouter);
app.use("/api/notification", notificationRourer);
app.use("/api/conversation", conversationRouter);
app.use("/api/message", messageRouter);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof Error) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

connectMongoose()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB, server not started:", err.message);
    process.exit(1);
  });
