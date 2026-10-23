import { Schema, model, Types } from "mongoose";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    bio: {
      type: String,
      default: "",
    },

    profilePicture: {
      type: String,
      default: "",
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    // Language practice profile (Phase 2.1) — filled in during onboarding.
    nativeLanguages: {
      type: [String],
      default: [],
    },

    learningLanguages: {
      type: [
        {
          code: { type: String, required: true },
          level: {
            type: String,
            enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
            required: true,
          },
          _id: false,
        },
      ],
      default: [],
    },

    country: {
      type: String,
      default: "",
      trim: true,
    },

    interests: {
      type: [String],
      default: [],
    },

    // Calls require 18+; stored as a year (not full DOB) to keep this low-sensitivity.
    birthYear: {
      type: Number,
      default: null,
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },

    followers: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],

    refreshToken: {
      type: String,
      default: "",
    },
    resetOTP: {
      type: String,
      default: null,
    },

    resetOTPExpire: {
      type: Date,
      default: null,
    },

    resetOTPAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = model("User", userSchema);

export default User;
