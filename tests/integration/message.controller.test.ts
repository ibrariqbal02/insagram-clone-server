import { sendMessage, getMessages, deleteMessage } from "../../src/controllers/message.controller";
import Conversation from "../../src/models/Conversation.model";
import Message from "../../src/models/Message.model";
import Notification from "../../src/models/Notification.model";

// Mock Mongoose models
jest.mock("../../src/models/Conversation.model");
jest.mock("../../src/models/Message.model");
jest.mock("../../src/models/Notification.model");

describe("Message Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      userId: "user_123", 
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  
    //  1. sendMessage
 
  describe("sendMessage", () => {
    it("should return 400 if message content is missing", async () => {
      req.params.conversationId = "conv_123";
      req.body = {};

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Message content is required.",
      });
    });

    it("should return 404 if conversation is not found", async () => {
      req.params.conversationId = "conv_123";
      req.body = { content: "Hello!" };

      (Conversation.findById as jest.Mock).mockResolvedValue(null);

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Conversation not found.",
      });
    });

    it("should create a message, update conversation lastMessage, and create notification", async () => {
      req.params.conversationId = "conv_123";
      req.body = { content: "Hello world!" };

      const mockConversation = {
        _id: "conv_123",
        participants: ["user_123", "user_456"],
        lastMessage: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockMessage = {
        _id: "msg_789",
        conversation: "conv_123",
        sender: "user_123",
        type: "text",
        content: "Hello world!",
      };

      (Conversation.findById as jest.Mock).mockResolvedValue(mockConversation);
      (Message.create as jest.Mock).mockResolvedValue(mockMessage);

      await sendMessage(req, res);

      expect(Message.create).toHaveBeenCalledWith({
        conversation: "conv_123",
        sender: "user_123",
        type: "text",
        content: "Hello world!",
      });

      expect(mockConversation.lastMessage).toBe("msg_789");
      expect(mockConversation.save).toHaveBeenCalled();

      expect(Notification.create).toHaveBeenCalledWith({
        sender: "user_123",
        receiver: "user_456",
        type: "message",
        conversation: "conv_123",
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Message sent successfully.",
        data: mockMessage,
      });
    });
  });


    //  2. getMessages

  describe("getMessages", () => {
    it("should return 404 if conversation is not found", async () => {
      req.params.conversationId = "conv_123";

      (Conversation.findById as jest.Mock).mockResolvedValue(null);

      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Conversation not found.",
      });
    });

    it("should return sorted messages for a valid conversation", async () => {
      req.params.conversationId = "conv_123";
      const mockMessages = [
        { _id: "msg_1", content: "Hey" },
        { _id: "msg_2", content: "How are you?" },
      ];

      (Conversation.findById as jest.Mock).mockResolvedValue({ _id: "conv_123" });
      (Message.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockMessages),
        }),
      });

      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalMessages: 2,
        messages: mockMessages,
      });
    });
  });


    //  3. deleteMessage

  describe("deleteMessage", () => {
    it("should return 404 if message is not found", async () => {
      req.params.messageId = "msg_123";

      (Message.findById as jest.Mock).mockResolvedValue(null);

      await deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Message not found.",
      });
    });

    it("should return 403 if authenticated user is not the message sender", async () => {
      req.params.messageId = "msg_123";

      const mockMessage = {
        _id: "msg_123",
        sender: "user_other",
      };

      (Message.findById as jest.Mock).mockResolvedValue(mockMessage);

      await deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "You are not authorized.",
      });
    });

    it("should delete message and update conversation lastMessage with previous message", async () => {
      req.params.messageId = "msg_123";

      const mockMessage = {
        _id: "msg_123",
        sender: "user_123",
        conversation: "conv_123",
      };

      const mockConversation = {
        _id: "conv_123",
        lastMessage: "msg_123",
        save: jest.fn().mockResolvedValue(true),
      };

      const mockPreviousLastMessage = {
        _id: "msg_122",
      };

      (Message.findById as jest.Mock).mockResolvedValue(mockMessage);
      (Conversation.findById as jest.Mock).mockResolvedValue(mockConversation);


      (Message.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockPreviousLastMessage),
      });

      await deleteMessage(req, res);

      expect(Message.findByIdAndDelete).toHaveBeenCalledWith("msg_123");
      expect(mockConversation.lastMessage).toBe("msg_122");
      expect(mockConversation.save).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Message deleted successfully.",
      });
    });
  });
});