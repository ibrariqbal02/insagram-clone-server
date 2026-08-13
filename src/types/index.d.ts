import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      files?: Multer.File[];
    }
  }
}