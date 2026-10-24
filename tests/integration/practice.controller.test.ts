import {
  getPracticeStats,
  getOnlinePartners,
  updateProfile,
  completeOnboarding,
} from "../../src/controllers/auth.controller";
import User from "../../src/models/User.model";
import { getOnlineUserIds } from "../../src/socket";

jest.mock("../../src/models/User.model");
jest.mock("../../src/socket");

describe("Practice dashboard endpoints", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = { body: {}, params: {}, userId: "user_me" };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("getPracticeStats", () => {
    it("returns zeros for untracked stats plus the user's daily goal", async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ dailyGoalMinutes: 15 }),
      });

      await getPracticeStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        stats: {
          streakDays: 0,
          minutesToday: 0,
          minutesTotal: 0,
          callsCount: 0,
          dailyGoalMinutes: 15,
        },
      });
    });

    it("falls back to a 10 minute daily goal", async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({}),
      });

      await getPracticeStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.objectContaining({ dailyGoalMinutes: 10 }),
        })
      );
    });

    it("returns 404 when the user is gone", async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await getPracticeStats(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getOnlinePartners", () => {
    it("returns an empty list when nobody else is online", async () => {
      (getOnlineUserIds as jest.Mock).mockReturnValue(["user_me"]);

      await getOnlinePartners(req, res);

      expect(User.find).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalUsers: 0,
        users: [],
      });
    });

    it("excludes the current user and returns the rest", async () => {
      const partners = [{ _id: "user_a", name: "Ana" }];

      (getOnlineUserIds as jest.Mock).mockReturnValue(["user_me", "user_a"]);
      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(partners),
        }),
      });

      await getOnlinePartners(req, res);

      expect(User.find).toHaveBeenCalledWith({ _id: { $in: ["user_a"] } });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        totalUsers: 1,
        users: partners,
      });
    });
  });

  describe("completeOnboarding", () => {
    it("saves the practice goal", async () => {
      req.body = {
        nativeLanguages: ["hi"],
        learningLanguages: [{ code: "en", level: "B1" }],
        goal: "travel",
      };

      const mockUser: any = { _id: "user_me", save: jest.fn().mockResolvedValue(true) };

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(mockUser) });

      await completeOnboarding(req, res);

      expect(mockUser.goal).toBe("travel");
      expect(mockUser.learningLanguages).toEqual([{ code: "en", level: "B1" }]);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("updateProfile", () => {
    it("updates learner fields and parses JSON-encoded language arrays", async () => {
      req.body = {
        name: "Ana",
        bio: "Learning English",
        country: "  Spain  ",
        goal: "job",
        nativeLanguages: JSON.stringify(["es"]),
        learningLanguages: JSON.stringify([{ code: "en", level: "B2" }]),
      };

      const mockUser: any = {
        _id: "user_me",
        username: "ana",
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(mockUser) });

      await updateProfile(req, res);

      expect(mockUser.name).toBe("Ana");
      expect(mockUser.bio).toBe("Learning English");
      expect(mockUser.country).toBe("Spain");
      expect(mockUser.goal).toBe("job");
      expect(mockUser.nativeLanguages).toEqual(["es"]);
      expect(mockUser.learningLanguages).toEqual([{ code: "en", level: "B2" }]);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("ignores malformed language JSON instead of wiping the field", async () => {
      req.body = { nativeLanguages: "not-json" };

      const mockUser: any = {
        _id: "user_me",
        username: "ana",
        nativeLanguages: ["es"],
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(mockUser) });

      await updateProfile(req, res);

      expect(mockUser.nativeLanguages).toEqual(["es"]);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
