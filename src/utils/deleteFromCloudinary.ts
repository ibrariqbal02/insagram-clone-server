import cloudinary from "../config/cloudinary";

const deleteFromCloudinary = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw error;
  }
};

export default deleteFromCloudinary;