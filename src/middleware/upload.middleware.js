const multer = require("multer");

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      allowedMimeTypes.includes(file.mimetype) ||
      file.originalname.match(/\.(pdf|docx?|xlsx?|txt|csv|png|jpe?g|webp)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error("File type not supported. Please upload an image or PDF/document file."), false);
    }
  },
});

module.exports = upload;