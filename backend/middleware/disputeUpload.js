
const multer = require("multer");
const { disputeStorage } = require("../config/cloudinary");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const storage = disputeStorage;

const uploadDisputeEvidence = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    const extension = file.originalname
      .split(".")
      .pop()
      .toLowerCase();

    const allowedExtensions = new Set([
      "jpg",
      "jpeg",
      "png",
      "webp",
      "pdf",
      "doc",
      "docx",
    ]);

    if (
      !allowedMimeTypes.has(file.mimetype) ||
      !allowedExtensions.has(extension)
    ) {
      return cb(new Error("Unsupported dispute evidence file type"));
    }

    cb(null, true);
  },
});

module.exports = uploadDisputeEvidence;
