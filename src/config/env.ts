import dotenv from "dotenv";

dotenv.config();

const REQUIRED_VARS = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "MAIL_USER",
  "MAIL_PASSWORD",
];

const DEFAULT_CLIENT_URLS =
  "http://localhost:5173,http://localhost:3000,https://insagram-clone-client.vercel.app,https://instagram-clone-client.vercel.app";

// Fail fast on startup instead of crashing later on the first request that needs a missing value.
export const validateEnv = () => {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
};

export const isProduction = () => process.env.NODE_ENV === "production";

export const getClientUrls = () =>
  (process.env.CLIENT_URLS || DEFAULT_CLIENT_URLS)
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

export const getPort = () => Number(process.env.PORT) || 5000;
