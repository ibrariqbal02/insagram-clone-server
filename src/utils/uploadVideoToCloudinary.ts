import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";

/**
 * Uploads a video buffer to Cloudinary.
 * Cloudinary uses resource_type "video" for actual video files.
 */
const uploadVideoToCloudinary = (
  buffer: Buffer,
  folder = "posts"
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
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

export default uploadVideoToCloudinary;
