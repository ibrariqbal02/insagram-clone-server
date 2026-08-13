import mongoose from "mongoose";

let isConnected = false;

const connectMongoose = async (): Promise<void> => {
  // Already connected — do nothing
  if (isConnected) return;

  // Mongoose readyState: 1 = connected, 2 = connecting
  if (mongoose.connection.readyState >= 1) {
    isConnected = true;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    isConnected = true;
    console.log("MongoDB connected to Atlas");
  } catch (error) {
    console.error("MongoDB connection failed");
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw error;
  }
};

export default connectMongoose;
