import request from "supertest";
import app from "../../src/app";
import { completeOnboarding } from "../../src/controllers/auth.controller";
import User from "../../src/models/User.model";
import { generateAccessToken } from "../../src/utils/generateToken";

jest.mock("../../src/models/User.model");

describe("completeOnboarding controller", () => {
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

  it("should return 404 if user is not found", async () => {
    req.body = {
      nativeLanguages: ["en"],
      learningLanguages: [{ code: "es", level: "A1" }],
    };

    (User.findById as jest.Mock).mockResolvedValueOnce(null);

    await completeOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found.",
    });
  });

  it("should save the onboarding fields and mark onboardingCompleted", async () => {
    req.body = {
      nativeLanguages: ["en"],
      learningLanguages: [{ code: "es", level: "A2" }],
      country: "  Canada  ",
      interests: ["travel", "music"],
      birthYear: 2000,
    };

    const mockUser: any = {
      _id: "user_123",
      save: jest.fn().mockResolvedValue(true),
    };
    const updatedUser = { _id: "user_123", onboardingCompleted: true };

    (User.findById as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(updatedUser) });

    await completeOnboarding(req, res);

    expect(mockUser.nativeLanguages).toEqual(["en"]);
    expect(mockUser.learningLanguages).toEqual([{ code: "es", level: "A2" }]);
    expect(mockUser.country).toBe("Canada");
    expect(mockUser.interests).toEqual(["travel", "music"]);
    expect(mockUser.birthYear).toBe(2000);
    expect(mockUser.onboardingCompleted).toBe(true);
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Onboarding completed.",
      user: updatedUser,
    });
  });

  it("should default country/interests/birthYear when omitted", async () => {
    req.body = {
      nativeLanguages: ["en"],
      learningLanguages: [{ code: "fr", level: "B1" }],
    };

    const mockUser: any = {
      _id: "user_123",
      save: jest.fn().mockResolvedValue(true),
    };

    (User.findById as jest.Mock)
      .mockResolvedValueOnce(mockUser)
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(mockUser) });

    await completeOnboarding(req, res);

    expect(mockUser.country).toBe("");
    expect(mockUser.interests).toEqual([]);
    expect(mockUser.birthYear).toBeNull();
  });
});

describe("PATCH /api/auth/onboarding validation", () => {
  const token = generateAccessToken("user_123");
  const authHeader = `Bearer ${token}`;

  it("rejects a request with no native languages", async () => {
    const res = await request(app)
      .patch("/api/auth/onboarding")
      .set("Authorization", authHeader)
      .send({ learningLanguages: [{ code: "es", level: "A1" }] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a learning language with an invalid level", async () => {
    const res = await request(app)
      .patch("/api/auth/onboarding")
      .set("Authorization", authHeader)
      .send({
        nativeLanguages: ["en"],
        learningLanguages: [{ code: "es", level: "Z9" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects a birth year that makes the user under 18", async () => {
    const underageYear = new Date().getFullYear() - 10;

    const res = await request(app)
      .patch("/api/auth/onboarding")
      .set("Authorization", authHeader)
      .send({
        nativeLanguages: ["en"],
        learningLanguages: [{ code: "es", level: "A1" }],
        birthYear: underageYear,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app)
      .patch("/api/auth/onboarding")
      .send({
        nativeLanguages: ["en"],
        learningLanguages: [{ code: "es", level: "A1" }],
      });

    expect(res.status).toBe(401);
  });
});
