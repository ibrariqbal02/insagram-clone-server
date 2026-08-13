import jwt, { Secret, SignOptions } from "jsonwebtoken";

const accessSecret: Secret = process.env.JWT_ACCESS_SECRET as string;
const refreshSecret: Secret = process.env.JWT_REFRESH_SECRET as string;

export const generateAccessToken = (userId: string) => {
  const options: SignOptions = {
    expiresIn: "15m",
  };

  return jwt.sign({ userId }, accessSecret, options);
};

export const generateRefreshToken = (userId: string) => {
  const options: SignOptions = {
    expiresIn: "7d",
  };

  return jwt.sign({ userId }, refreshSecret, options);
};
