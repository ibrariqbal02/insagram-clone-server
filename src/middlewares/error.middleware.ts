import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { isProduction } from "../config/env";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Errors from body-parser (bad JSON, body too large) and CORS carry their own status.
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : 500;

  if (status === 500) {
    console.error(err);
  }

  // Never leak internal error details to users in production.
  const message =
    status < 500 || !isProduction()
      ? err instanceof Error
        ? err.message
        : "Internal Server Error"
      : "Internal Server Error";

  return res.status(status).json({
    success: false,
    message,
  });
};
