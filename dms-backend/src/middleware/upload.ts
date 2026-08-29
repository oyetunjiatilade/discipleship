import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

/**
 * Allowed MIME types by category.
 */
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
];

const ALLOWED_NOTES_TYPES = [
  'application/pdf',
];

/**
 * Max file sizes.
 */
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;  // 500 MB
const MAX_NOTES_SIZE = 20 * 1024 * 1024;   // 20 MB

// ── Video upload middleware ──

const videoFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid video type: ${file.mimetype}. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`));
  }
};

export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: videoFilter,
}).single('file');

// ── Notes file upload middleware ──

const notesFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_NOTES_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF is allowed.`));
  }
};

export const uploadNotes = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_NOTES_SIZE },
  fileFilter: notesFilter,
}).single('file');
