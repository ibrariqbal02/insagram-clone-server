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
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG and WEBP images are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;
