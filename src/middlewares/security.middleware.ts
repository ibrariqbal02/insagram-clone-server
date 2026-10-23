import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { validationResult } from "express-validator";

const limitMessage = {
  success: false,
  message: "Too many requests, please try again later.",
};

// High default because the client still polls messages every second; lower it once
// chat moves to Socket.IO (Phase 1.11–1.13).
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API_MAX) || 3000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limitMessage,
});

// Login and register: slows down password guessing. Only failed attempts count.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limitMessage,
});

// Forgot / reset password: a 6-digit OTP must not be brute-forceable.
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limitMessage,
});

// Removes keys like "$ne" or "a.b" so request data can't inject MongoDB operators
// (e.g. { "login": { "$ne": null } } would otherwise match any user).
const stripOperators = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripOperators);

  if (value && typeof value === "object") {
    const clean: Record<string, unknown> = {};

    for (const [key, inner] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = stripOperators(inner);
    }

    return clean;
  }

  return value;
};

export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = stripOperators(req.body);
  if (req.params) req.params = stripOperators(req.params) as Request["params"];
  next();
};

// Runs after express-validator chains and returns the first error in the usual response shape.
export const handleValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
    });
  }

  next();
};
