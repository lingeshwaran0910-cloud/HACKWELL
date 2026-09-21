import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

/**
 * Multer configuration for video uploads.
 * - 50 MB max file size (videos can be large for accident footage)
 * - Only MP4, MOV, AVI, WebM, MKV allowed
 * - Stored in OS temp dir with unique name — caller is responsible for cleanup
 */

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',    // .mov
  'video/x-msvideo',   // .avi
  'video/webm',
  'video/x-matroska',  // .mkv
  'video/mpeg',
]);

const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.webm', '.mkv', '.mpeg', '.mpg']);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmpDir = path.join(require('os').tmpdir(), 'hackwell-uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    cb(null, tmpDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const uniqueName = `hw-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, uniqueName);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) && !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Unsupported video format '${file.mimetype}'. Allowed: MP4, MOV, AVI, WebM, MKV`));
  }
  cb(null, true);
}

export const videoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});
