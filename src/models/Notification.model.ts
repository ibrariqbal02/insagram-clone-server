import { Schema, model, Types } from "mongoose";

const notificationSchema = new Schema(
  {
    receiver: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["follow", "like", "comment", "reply", "message"],
      required: true,
    },

    post: {
      type: Types.ObjectId,
      ref: "Post",
      default: null,
    },

    comment: {
      type: Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    conversation: {
      type: Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = model("Notification", notificationSchema);

export default Notification;
