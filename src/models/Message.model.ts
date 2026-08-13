import { Schema, model, Types } from "mongoose";

const messageSchema = new Schema(
  {
    conversation: {
      type: Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "voice", "post"],
      required: true,
    },

    content: {
      type: String,
      default: "",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Message = model("Message", messageSchema);

export default Message;
