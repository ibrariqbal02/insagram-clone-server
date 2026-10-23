import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getAccessTokenFromRequest } from "../utils/authTokens";

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No Token Found",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as { userId: string };

    req.userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
};

export default isAuthenticated;

// Attaches req.userId when a valid access token is present, but never blocks the request.
// Use on public routes that need to be aware of private profiles.
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET as string
      ) as { userId: string };

      req.userId = decoded.userId;
    }
  } catch {
    // Invalid / expired token — just proceed unauthenticated
  }

  next();
};
