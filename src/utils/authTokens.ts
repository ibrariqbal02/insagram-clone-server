import { CookieOptions, Request, Response } from "express";
import crypto from "crypto";

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

type SameSite = "strict" | "lax" | "none";

// Defaults match a web client and API on different domains (Vercel + separate server).
// Set COOKIE_SAMESITE=lax and COOKIE_SECURE=false for plain-http local setups if needed.
const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== "false",
  sameSite: (process.env.COOKIE_SAMESITE as SameSite) || "none",
  path: "/",
});

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie("accessToken", accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_MAX_AGE,
  });

  res.cookie("refreshToken", refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_MAX_AGE,
  });
};

// Clearing must use the same attributes the cookie was set with, or browsers ignore it.
export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", baseCookieOptions());
  res.clearCookie("refreshToken", baseCookieOptions());
};

// Mobile apps can't rely on cookies, so they send this header and get tokens in the body.
export const wantsTokensInBody = (req: Request) =>
  req.headers?.["x-client-platform"] === "mobile";

export const getAccessTokenFromRequest = (req: Request): string | undefined => {
  const header = req.headers?.authorization;

  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return req.cookies?.accessToken;
};

// Refresh tokens and OTPs are stored hashed so a database leak can't be used to log in.
export const hashToken = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
