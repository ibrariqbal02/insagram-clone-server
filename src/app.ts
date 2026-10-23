import express, { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { getClientUrls } from "./config/env";
import router from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/comment.routes";
import followRouter from "./routes/follow.routes";
import feedRouter from "./routes/feed.routes";
import searchRouter from "./routes/search.routes";
import notificationRourer from "./routes/notification.routes";
import conversationRouter from "./routes/conversation.routes";
import messageRouter from "./routes/message.routes";
import { apiLimiter, sanitizeRequest } from "./middlewares/security.middleware";
import { errorHandler, notFound } from "./middlewares/error.middleware";

const app: Application = express();

const allowedOrigins = getClientUrls();

app.set("trust proxy", 1);

// The API is called cross-origin by the web client, so allow cross-origin reads of responses.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(Object.assign(new Error(`CORS: origin ${origin} not allowed`), { status: 403 }));
    },
    credentials: true,
  })
);

// middleware
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeRequest);
app.use("/api", apiLimiter);

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

app.use(notFound);
app.use(errorHandler);

export default app;
