import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "../config/env.js";

// Configure Cloudinary at module load if credentials are already present.
// The service also reconfigures lazily on first call so that test stubs set
// on process.env before import are always picked up in any execution order.
function ensureConfigured() {
  const name   = process.env.CLOUDINARY_CLOUD_NAME;
  const key    = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || !key || !secret) {
    throw new Error("Cloudinary is not configured. Please set CLOUDINARY_* environment variables.");
  }
  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret });
}

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

export const cloudinaryService = {
  /**
   * Uploads a tile image to Cloudinary and generates a thumbnail via eager transformations.
   * 
   * @param {Buffer} buffer - The image buffer to upload.
   * @param {string} originalFilename - The original filename.
   * @returns {Promise<{url: string, thumbnailUrl: string, publicId: string}>}
   */
  uploadTileImage: async function(buffer, originalFilename) {
    ensureConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "tile-visualizer/tiles",
        // Eagerly transform to a small, optimized WebP thumbnail
        eager: [{ width: 300, height: 300, crop: "fill", format: "webp", quality: 70 }],
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }

        resolve({
          url: result.secure_url,
          thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
  },

  /**
   * Deletes an image from Cloudinary by its public ID.
   * 
   * @param {string} publicId - The public ID of the image to delete.
   * @returns {Promise<any>}
   */
  deleteTileImage: async function(publicId) {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET || !publicId) return;
    return cloudinary.uploader.destroy(publicId);
  }
};
