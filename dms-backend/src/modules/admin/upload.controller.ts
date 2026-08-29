import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { uploadToCloudinary, type UploadResult } from '../../shared/services/cloudinary.service';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { uploadVideo, uploadNotes } from '../../middleware/upload';

/**
 * Upload controller.
 *
 * POST /v1/admin/upload/video       → upload video to Cloudinary
 * POST /v1/admin/upload/notes-file  → upload PDF to Cloudinary
 * POST /v1/admin/upload/notes-text  → convert text to PDF, upload to Cloudinary
 */
class UploadController {
  /**
   * POST /v1/admin/upload/video
   * Accepts multipart/form-data with field "file" (video).
   * Returns { url, publicId }.
   */
  async uploadVideoFile(req: Request, res: Response, _next: NextFunction): Promise<void> {
    // Run multer middleware inline
    uploadVideo(req, res, async (err) => {
      if (err) {
        return sendError(res, 400, 'UPLOAD_ERROR', err.message);
      }

      if (!req.file) {
        return sendError(res, 400, 'MISSING_FILE', 'No video file provided. Use field name "file".');
      }

      try {
        const result: UploadResult = await uploadToCloudinary(req.file.buffer, {
          folder: 'dms/lessons/videos',
          resourceType: 'video',
        });

        sendSuccess(res, 200, result);
      } catch (uploadErr: any) {
        return sendError(
          res,
          500,
          'CLOUDINARY_ERROR',
          uploadErr.message || 'Failed to upload video to Cloudinary'
        );
      }
    });
  }

  /**
   * POST /v1/admin/upload/notes-file
   * Accepts multipart/form-data with field "file" (PDF).
   * Returns { url, publicId }.
   */
  async uploadNotesFile(req: Request, res: Response, _next: NextFunction): Promise<void> {
    uploadNotes(req, res, async (err) => {
      if (err) {
        return sendError(res, 400, 'UPLOAD_ERROR', err.message);
      }

      if (!req.file) {
        return sendError(res, 400, 'MISSING_FILE', 'No PDF file provided. Use field name "file".');
      }

      try {
        const result: UploadResult = await uploadToCloudinary(req.file.buffer, {
          folder: 'dms/lessons/notes',
          resourceType: 'raw',
        });

        sendSuccess(res, 200, result);
      } catch (uploadErr: any) {
        return sendError(
          res,
          500,
          'CLOUDINARY_ERROR',
          uploadErr.message || 'Failed to upload PDF to Cloudinary'
        );
      }
    });
  }

  /**
   * POST /v1/admin/upload/notes-text
   * Accepts JSON { title, content }.
   * Generates a PDF from the text, uploads to Cloudinary.
   * Returns { url, publicId }.
   */
  async uploadNotesText(req: Request, res: Response): Promise<void> {
    const { title, content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Content must be at least 10 characters.');
    }

    const noteTitle = (title && typeof title === 'string') ? title.trim() : 'Lesson Notes';

    try {
      // Generate PDF in memory
      const pdfBuffer = await this.generatePdf(noteTitle, content.trim());

      // Upload to Cloudinary
      const result: UploadResult = await uploadToCloudinary(pdfBuffer, {
        folder: 'dms/lessons/notes',
        resourceType: 'raw',
        format: 'pdf',
      });

      sendSuccess(res, 200, result);
    } catch (err: any) {
      return sendError(
        res,
        500,
        'PDF_GENERATION_ERROR',
        err.message || 'Failed to generate or upload PDF'
      );
    }
  }

  /**
   * Generate a PDF from title + text content.
   * Returns a Buffer.
   */
  private generatePdf(title: string, content: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        margin: 60,
        size: 'A4',
        info: {
          Title: title,
          Author: 'Team Barnabas DMS',
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Title ──
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(title, { align: 'center' })
        .moveDown(0.5);

      // ── Divider line ──
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(60, doc.y)
        .lineTo(535, doc.y)
        .stroke()
        .moveDown(1);

      // ── Content ──
      // Split into paragraphs and render with proper spacing
      const paragraphs = content.split(/\n{2,}/);
      doc.fontSize(12).font('Helvetica');

      paragraphs.forEach((paragraph, idx) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return;

        // Check if it looks like a heading (short line, possibly bold indicator)
        if (trimmed.length < 80 && !trimmed.includes('.') && idx > 0) {
          doc
            .moveDown(0.5)
            .fontSize(14)
            .font('Helvetica-Bold')
            .text(trimmed)
            .moveDown(0.3)
            .fontSize(12)
            .font('Helvetica');
        } else {
          // Regular paragraph — handle single newlines as line breaks
          const lines = trimmed.replace(/\n/g, '\n');
          doc.text(lines, { align: 'justify', lineGap: 4 });
          doc.moveDown(0.7);
        }
      });

      // ── Footer ──
      doc
        .moveDown(2)
        .fontSize(9)
        .fillColor('#999999')
        .text('Generated by Team Barnabas Discipleship Management System', {
          align: 'center',
        });

      doc.end();
    });
  }
}

export const uploadController = new UploadController();
