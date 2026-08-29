import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { cloudinaryConfig } from '../../config';

// ── Configure Cloudinary on import ──
cloudinary.config({
  cloud_name: cloudinaryConfig.cloudName,
  api_key: cloudinaryConfig.apiKey,
  api_secret: cloudinaryConfig.apiSecret,
});

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload a buffer to Cloudinary.
 *
 * @param buffer  - File contents
 * @param options - Cloudinary upload options
 * @returns { url, publicId }
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    resourceType: 'video' | 'image' | 'raw' | 'auto';
    publicId?: string;
    format?: string;
  }
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType,
        public_id: options.publicId,
        format: options.format,
        overwrite: true,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete a resource from Cloudinary.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'video' | 'image' | 'raw' = 'raw'
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
