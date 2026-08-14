import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";

/**
 * Uploads an audio buffer to Cloudinary.
 * Cloudinary requires resource_type "video" for audio files.
 */
const uploadAudioToCloudinary = (
  buffer: Buffer,
  folder = "voice_messages"
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video", // Cloudinary uses "video" resource type for audio
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export default uploadAudioToCloudinary;
