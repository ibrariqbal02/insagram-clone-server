import { createConversation } from "../../src/controllers/conversation.controller";
import Conversation from "../../src/models/Conversation.model";

jest.mock("../../src/models/Conversation.model");

describe("Conversation Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      body: {},
      userId: "user_123",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it("should prevent starting a conversation with oneself", async () => {
    req.body = { receiverId: "user_123" };

    await createConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "You cannot chat with yourself.",
    });
  });

  it("should return existing conversation if found", async () => {
    req.body = { receiverId: "user_456" };
    const mockConversation = { _id: "conv_123", participants: ["user_123", "user_456"] };

    (Conversation.findOne as jest.Mock).mockResolvedValue(mockConversation);

    await createConversation(req, res);

    expect(Conversation.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      conversation: mockConversation,
    });
  });
});