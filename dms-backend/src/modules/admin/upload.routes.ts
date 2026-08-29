import { Router } from 'express';
import { uploadController } from './upload.controller';

// ══════════════════════════════════════════════
//  ADMIN UPLOAD ROUTES — mounted at /v1/admin/upload
//  (authenticate + authorize('admin') applied in app.ts)
// ══════════════════════════════════════════════

const router = Router();

/**
 * POST /v1/admin/upload/video
 * Upload a video file to Cloudinary.
 * Content-Type: multipart/form-data, field name: "file"
 * Returns: { url, publicId }
 */
router.post(
  '/video',
  // multer runs inside the controller to handle errors gracefully
  (req, res, next) => uploadController.uploadVideoFile(req, res, next)
);

/**
 * POST /v1/admin/upload/notes-file
 * Upload a PDF file to Cloudinary.
 * Content-Type: multipart/form-data, field name: "file"
 * Returns: { url, publicId }
 */
router.post(
  '/notes-file',
  (req, res, next) => uploadController.uploadNotesFile(req, res, next)
);

/**
 * POST /v1/admin/upload/notes-text
 * Convert text content to PDF and upload to Cloudinary.
 * Content-Type: application/json
 * Body: { title?: string, content: string }
 * Returns: { url, publicId }
 */
router.post(
  '/notes-text',
  (req, res) => uploadController.uploadNotesText(req, res)
);

export { router as uploadAdminRoutes };
