import { Server as IOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import Conversation from "../models/Conversation.model";
import Message from "../models/Message.model";
import { getClientUrls } from "../config/env";

let io: IOServer | null = null;

// Counts connected sockets per user so presence only flips on the first
// connection / last disconnection (a user can have several tabs/devices open).
const onlineSocketCounts = new Map<string, number>();

const userRoom = (userId: string) => `user:${userId}`;

const getTokenFromHandshake = (socket: Socket): string | undefined => {
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) return authToken;

  const header = socket.handshake.headers?.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7);
  }

  const cookieHeader = socket.handshake.headers?.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("accessToken="));

    if (match) return decodeURIComponent(match.slice("accessToken=".length));
  }

  return undefined;
};

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token = getTokenFromHandshake(socket);

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as { userId: string };

    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
};

const uniqueParticipantIds = (
  participants: Array<{ toString(): string }>,
  excludeUserId?: string
) => {
  const ids = new Set<string>();

  for (const participant of participants) {
    const id = participant.toString();
    if (id !== excludeUserId) ids.add(id);
  }

  return ids;
};

const broadcastPresence = async (userId: string, online: boolean) => {
  if (!io) return;

  const conversations = await Conversation.find({ participants: userId }).select(
    "participants"
  );

  const peerIds = new Set<string>();
  for (const conversation of conversations) {
    for (const id of uniqueParticipantIds(conversation.participants as any[], userId)) {
      peerIds.add(id);
    }
  }

  for (const peerId of peerIds) {
    io.to(userRoom(peerId)).emit("presence:update", { userId, online });
  }
};

const handleTyping = async (
  socket: Socket,
  conversationId: string | undefined,
  isTyping: boolean
) => {
  if (!io || !conversationId) return;

  const userId = socket.data.userId as string;
  const conversation = await Conversation.findById(conversationId).select(
    "participants"
  );
  if (!conversation) return;

  const participants = conversation.participants as any[];
  const isParticipant = participants.some((id) => id.toString() === userId);
  if (!isParticipant) return;

  for (const peerId of uniqueParticipantIds(participants, userId)) {
    io.to(userRoom(peerId)).emit("typing:update", {
      conversationId,
      userId,
      isTyping,
    });
  }
};

const handleMessageRead = async (
  socket: Socket,
  conversationId: string | undefined
) => {
  if (!io || !conversationId) return;

  const userId = socket.data.userId as string;
  const conversation = await Conversation.findById(conversationId).select(
    "participants"
  );
  if (!conversation) return;

  const participants = conversation.participants as any[];
  const isParticipant = participants.some((id) => id.toString() === userId);
  if (!isParticipant) return;

  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, isRead: false },
    { $set: { isRead: true } }
  );

  for (const peerId of uniqueParticipantIds(participants, userId)) {
    io.to(userRoom(peerId)).emit("message:read", { conversationId, readBy: userId });
  }
};

export const initSocket = (httpServer: HTTPServer): IOServer => {
  io = new IOServer(httpServer, {
    cors: {
      origin: getClientUrls(),
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    socket.join(userRoom(userId));

    const previousCount = onlineSocketCounts.get(userId) ?? 0;
    onlineSocketCounts.set(userId, previousCount + 1);

    if (previousCount === 0) {
      broadcastPresence(userId, true).catch((err) =>
        console.error("Failed to broadcast online presence:", err)
      );
    }

    socket.on("typing:start", (payload: { conversationId?: string }) => {
      handleTyping(socket, payload?.conversationId, true).catch((err) =>
        console.error("Failed to handle typing:start:", err)
      );
    });

    socket.on("typing:stop", (payload: { conversationId?: string }) => {
      handleTyping(socket, payload?.conversationId, false).catch((err) =>
        console.error("Failed to handle typing:stop:", err)
      );
    });

    socket.on("message:read", (payload: { conversationId?: string }) => {
      handleMessageRead(socket, payload?.conversationId).catch((err) =>
        console.error("Failed to handle message:read:", err)
      );
    });

    socket.on("disconnect", () => {
      const remaining = (onlineSocketCounts.get(userId) ?? 1) - 1;

      if (remaining <= 0) {
        onlineSocketCounts.delete(userId);
        broadcastPresence(userId, false).catch((err) =>
          console.error("Failed to broadcast offline presence:", err)
        );
      } else {
        onlineSocketCounts.set(userId, remaining);
      }
    });
  });

  return io;
};

export const getIO = (): IOServer | null => io;

// Ids of users with at least one live socket. In-memory and per-process,
// so it only reflects this instance (fine while the server is single-node).
export const getOnlineUserIds = (): string[] => Array.from(onlineSocketCounts.keys());

// Used by controllers to push a real-time event to a set of users' own
// room (joined on connect), regardless of which conversation rooms exist.
export const emitToUsers = (
  userIds: Array<{ toString(): string }>,
  event: string,
  payload: unknown
) => {
  if (!io) return;

  for (const id of uniqueParticipantIds(userIds)) {
    io.to(userRoom(id)).emit(event, payload);
  }
};
