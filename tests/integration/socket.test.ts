import http from "http";
import type { AddressInfo } from "net";
import request from "supertest";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import app from "../../src/app";
import { initSocket } from "../../src/socket";
import User from "../../src/models/User.model";
import Conversation from "../../src/models/Conversation.model";
import Message from "../../src/models/Message.model";
import { generateAccessToken } from "../../src/utils/generateToken";

describe("Real-time chat over Socket.IO", () => {
  let httpServer: http.Server;
  let port: number;

  let userA: any;
  let userB: any;
  let conversationId: string;
  let tokenA: string;
  let tokenB: string;

  let clientA: ClientSocket | undefined;
  let clientB: ClientSocket | undefined;

  beforeAll(async () => {
    httpServer = http.createServer(app);
    initSocket(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  beforeEach(async () => {
    userA = await User.create({
      name: "User A",
      username: "usera",
      email: "usera@example.com",
      password: "hashedpassword123",
    });
    userB = await User.create({
      name: "User B",
      username: "userb",
      email: "userb@example.com",
      password: "hashedpassword123",
    });

    const conversation = await Conversation.create({
      participants: [userA._id, userB._id],
    });
    conversationId = (conversation._id as any).toString();

    tokenA = generateAccessToken(userA._id.toString());
    tokenB = generateAccessToken(userB._id.toString());
  });

  afterEach(() => {
    clientA?.disconnect();
    clientB?.disconnect();
    clientA = undefined;
    clientB = undefined;
  });

  const connect = (token: string) =>
    new Promise<ClientSocket>((resolve, reject) => {
      const socket = ioClient(`http://localhost:${port}`, {
        auth: { token },
        transports: ["websocket"],
        forceNew: true,
      });
      socket.once("connect", () => resolve(socket));
      socket.once("connect_error", (err) => reject(err));
    });

  it("rejects a connection without a valid token", async () => {
    await expect(
      new Promise((resolve, reject) => {
        const socket = ioClient(`http://localhost:${port}`, {
          auth: { token: "bad-token" },
          transports: ["websocket"],
          forceNew: true,
        });
        socket.once("connect", () => resolve(socket));
        socket.once("connect_error", (err) => reject(err));
      })
    ).rejects.toBeDefined();
  });

  it("notifies the other participant about online/offline presence", async () => {
    clientB = await connect(tokenB);

    const onlineEvent = new Promise((resolve) => {
      clientB!.once("presence:update", resolve);
    });

    clientA = await connect(tokenA);

    await expect(onlineEvent).resolves.toEqual({
      userId: userA._id.toString(),
      online: true,
    });

    const offlineEvent = new Promise((resolve) => {
      clientB!.once("presence:update", resolve);
    });

    clientA.disconnect();

    await expect(offlineEvent).resolves.toEqual({
      userId: userA._id.toString(),
      online: false,
    });
  });

  it("broadcasts typing start/stop to the other participant only", async () => {
    clientA = await connect(tokenA);
    clientB = await connect(tokenB);

    const typingStart = new Promise((resolve) => {
      clientB!.once("typing:update", resolve);
    });

    clientA.emit("typing:start", { conversationId });

    await expect(typingStart).resolves.toEqual({
      conversationId,
      userId: userA._id.toString(),
      isTyping: true,
    });

    const typingStop = new Promise((resolve) => {
      clientB!.once("typing:update", resolve);
    });

    clientA.emit("typing:stop", { conversationId });

    await expect(typingStop).resolves.toEqual({
      conversationId,
      userId: userA._id.toString(),
      isTyping: false,
    });
  });

  it("marks unread messages as read and notifies the sender", async () => {
    clientA = await connect(tokenA);
    clientB = await connect(tokenB);

    const message = await Message.create({
      conversation: conversationId,
      sender: userA._id,
      type: "text",
      content: "Hello there",
    });

    const readEvent = new Promise((resolve) => {
      clientA!.once("message:read", resolve);
    });

    clientB.emit("message:read", { conversationId });

    await expect(readEvent).resolves.toEqual({
      conversationId,
      readBy: userB._id.toString(),
    });

    const updated = await Message.findById(message._id);
    expect(updated?.isRead).toBe(true);
  });

  it("emits message:new over the socket when a message is sent via the REST API", async () => {
    clientA = await connect(tokenA);
    clientB = await connect(tokenB);

    const messageNewEvent = new Promise<any>((resolve) => {
      clientB!.once("message:new", resolve);
    });

    await request(app)
      .post(`/api/message/${conversationId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Hi there" })
      .expect(201);

    const event = await messageNewEvent;

    expect(event.conversationId).toBe(conversationId);
    expect(event.message.content).toBe("Hi there");
  });
});
