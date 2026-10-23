import { forgotPassword, refreshToken, resetPassword, login } from "../../src/controllers/auth.controller";
import User from "../../src/models/User.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../../src/utils/generateToken";
import { hashToken } from "../../src/utils/authTokens";
import sendEmail from "../../src/utils/sendEmail";

jest.mock("../../src/models/User.model");
jest.mock("../../src/utils/generateToken");
jest.mock("../../src/utils/sendEmail");
jest.mock("jsonwebtoken");
jest.mock("bcrypt");

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  cookie: jest.fn().mockReturnThis(),
  clearCookie: jest.fn().mockReturnThis(),
});

describe("password reset and refresh", () => {
  let res: any;

  beforeEach(() => {
    res = makeRes();
  });

  it("forgotPassword does not reveal whether the email exists", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    await forgotPassword({ body: { email: "nobody@example.com" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("forgotPassword stores a hashed OTP, not the code itself", async () => {
    const user: any = { save: jest.fn() };
    (User.findOne as jest.Mock).mockResolvedValue(user);

    await forgotPassword({ body: { email: "a@example.com" } } as any, res);

    const sentText = (sendEmail as jest.Mock).mock.calls[0][2] as string;
    const otp = sentText.match(/\d{6}/)![0];
    expect(user.resetOTP).toBe(hashToken(otp));
    expect(user.resetOTPAttempts).toBe(0);
  });

  it("resetPassword counts wrong attempts and locks after 5", async () => {
    const user: any = {
      resetOTP: hashToken("123456"),
      resetOTPExpire: new Date(Date.now() + 60_000),
      resetOTPAttempts: 4,
      save: jest.fn(),
    };
    (User.findOne as jest.Mock).mockResolvedValue(user);

    await resetPassword({ body: { email: "a@example.com", otp: "000000", newPassword: "newpass123" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(user.resetOTPAttempts).toBe(5);

    res = makeRes();
    await resetPassword({ body: { email: "a@example.com", otp: "123456", newPassword: "newpass123" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("resetPassword accepts the right OTP and logs out other devices", async () => {
    const user: any = {
      resetOTP: hashToken("123456"),
      resetOTPExpire: new Date(Date.now() + 60_000),
      resetOTPAttempts: 0,
      refreshToken: "old",
      save: jest.fn(),
    };
    (User.findOne as jest.Mock).mockResolvedValue(user);
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");

    await resetPassword({ body: { email: "a@example.com", otp: "123456", newPassword: "newpass123" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(user.resetOTP).toBeNull();
    expect(user.refreshToken).toBe("");
  });

  it("refreshToken rotates the token and accepts it from the body for mobile", async () => {
    const user: any = { _id: "u1", refreshToken: hashToken("old_refresh"), save: jest.fn() };
    (jwt.verify as jest.Mock).mockReturnValue({ userId: "u1" });
    (User.findById as jest.Mock).mockResolvedValue(user);
    (generateAccessToken as jest.Mock).mockReturnValue("new_access");
    (generateRefreshToken as jest.Mock).mockReturnValue("new_refresh");

    const req: any = {
      cookies: {},
      body: { refreshToken: "old_refresh" },
      headers: { "x-client-platform": "mobile" },
    };
    await refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(user.refreshToken).toBe(hashToken("new_refresh"));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "new_access", refreshToken: "new_refresh" })
    );
  });

  it("refreshToken rejects a token that was already rotated", async () => {
    const user: any = { _id: "u1", refreshToken: hashToken("newer"), save: jest.fn() };
    (jwt.verify as jest.Mock).mockReturnValue({ userId: "u1" });
    (User.findById as jest.Mock).mockResolvedValue(user);

    await refreshToken({ cookies: { refreshToken: "old" }, body: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("login only returns tokens in the body for mobile clients", async () => {
    const user: any = {
      _id: "u1",
      password: "hashed",
      save: jest.fn(),
      toObject: () => ({ _id: "u1", password: "hashed", refreshToken: "x" }),
    };
    (User.findOne as jest.Mock).mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (generateAccessToken as jest.Mock).mockReturnValue("a");
    (generateRefreshToken as jest.Mock).mockReturnValue("r");

    await login({ body: { login: "u", password: "p" }, headers: {} } as any, res);
    expect(res.json.mock.calls[0][0].accessToken).toBeUndefined();
    expect(user.refreshToken).toBe(hashToken("r"));

    res = makeRes();
    await login({ body: { login: "u", password: "p" }, headers: { "x-client-platform": "mobile" } } as any, res);
    expect(res.json.mock.calls[0][0]).toEqual(expect.objectContaining({ accessToken: "a", refreshToken: "r" }));
  });
});
