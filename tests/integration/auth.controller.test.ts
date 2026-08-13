import { register, login, logout, getMyProfile } from "../../src/controllers/auth.controller";
import User from "../../src/models/User.model";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../../src/utils/generateToken";


jest.mock("../../src/models/User.model");
jest.mock("bcrypt");
jest.mock("../../src/utils/generateToken");

describe("User Controller", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      body: {},
      cookies: {},
      params: {},
      userId: "user_123",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should return 400 if required fields are missing", async () => {
      req.body = { name: "Test User", email: "test@example.com" };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "All fields are required.",
      });
    });

    it("should return 400 if user already exists", async () => {
      req.body = {
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      (User.findOne as jest.Mock).mockResolvedValue({ _id: "existing_id" });

      await register(req, res);

      expect(User.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email or Username already exists.",
      });
    });

    it("should register user successfully", async () => {
      req.body = {
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      const mockUserData = {
        _id: "user_123",
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
        password: "hashed_password",
        refreshToken: "refresh_token_123",
      };

      const mockSavedUser = {
        ...mockUserData,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue(mockUserData),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
      (User.create as jest.Mock).mockResolvedValue(mockSavedUser);
      (generateAccessToken as jest.Mock).mockReturnValue("access_token_123");
      (generateRefreshToken as jest.Mock).mockReturnValue("refresh_token_123");

      await register(req, res);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "user create successfully",
        user: {
          _id: "user_123",
          name: "Test User",
          username: "testuser",
          email: "test@example.com",
        },
      });
    });
  });

  describe("login", () => {
    it("should return 400 if missing login or password", async () => {
      req.body = { login: "testuser" };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if user not found", async () => {
      req.body = { login: "testuser", password: "password123" };
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 401 on incorrect password", async () => {
      req.body = { login: "testuser", password: "wrongpassword" };
      (User.findOne as jest.Mock).mockResolvedValue({
        password: "hashed_password",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should login successfully and set cookies", async () => {
      req.body = { login: "testuser", password: "password123" };
      const mockUser = {
        _id: "user_123",
        password: "hashed_password",
        refreshToken: "",
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: "user_123",
          username: "testuser",
          password: "hashed_password",
          refreshToken: "refresh_token",
        }),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (generateAccessToken as jest.Mock).mockReturnValue("access_token");
      (generateRefreshToken as jest.Mock).mockReturnValue("refresh_token");

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe("logout", () => {
    it("should clear cookies and reset user refresh token", async () => {
      const mockUser = {
        refreshToken: "token",
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await logout(req, res);

      expect(mockUser.refreshToken).toBe("");
      expect(res.clearCookie).toHaveBeenCalledWith("accessToken");
      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getMyProfile", () => {
    it("should return profile data for authenticated user", async () => {
      const mockUser = { _id: "user_123", name: "Test User" };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await getMyProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: mockUser,
      });
    });
  });
});