
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const env = require("./env");

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

// Existing general-purpose storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "skillswap",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"],
  }),
});

// Separate storage for dispute evidence

const disputeStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "skillswap/disputes",
    resource_type: "raw",
    type: "authenticated",
    public_id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
  }),
});


module.exports = {
  cloudinary,
  storage,
  disputeStorage,
};
