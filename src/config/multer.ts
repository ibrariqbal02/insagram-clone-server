import multer, { FileFilterCallback } from "multer";
// import path from "node:path";
// import fs from "node:fs/promises";

// const uploadsDir = path.resolve(__dirname, "../../uploads");
//  this is for locally upload image 
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     fs.mkdir(uploadsDir, { recursive: true })
//       .then(() => cb(null, uploadsDir))
//       .catch((error) => cb(error, uploadsDir));
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = Date.now() + path.extname(file.originalname);
//     cb(null, uniqueName);
//   },
// });
// this is for deployment
const storage = multer.memoryStorage();
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if ([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP images or MP4, WebM, MOV, AVI videos are allowed."));
  }
};

// 5 MB for images, 100 MB for videos
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export default upload;
