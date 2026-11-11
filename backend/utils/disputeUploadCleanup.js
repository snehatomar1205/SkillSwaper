
const { cloudinary } = require("../config/cloudinary");

const cleanupDisputeUploads = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const publicId = file.filename || file.public_id;

      if (!publicId) {
        return;
      }

      const resourceType =
        file.resource_type ||
        (file.mimetype?.startsWith("image/")
          ? "image"
          : "raw");

      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: "authenticated",
        invalidate: true,
      });
    })
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        "Cloudinary cleanup failed:",
        files[index]?.filename,
        result.reason
      );
    }
  });
};

module.exports = {
  cleanupDisputeUploads,
};