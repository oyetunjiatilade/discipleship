import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import { User } from '../user/user.model';
import { Course } from '../course/course.model';
import { progressService } from '../progress/progress.service';
import { DiscipleshipStage } from '../../shared/constants/stages';
import { NotFoundError, AppError } from '../../shared/errors';

const COMPLETED_STAGES: DiscipleshipStage[] = [
  DiscipleshipStage.CLASS_COMPLETED,
  DiscipleshipStage.BAPTIZED,
  DiscipleshipStage.MEMBER_TRANSFERRED,
];

interface CertificateData {
  name: string;
  courseTitle: string;
  dateStr: string;
}

class CertificateService {
  /**
   * Produce a completion certificate PDF for a convert, if eligible.
   * Eligible = completed all lessons OR already past Class Completed.
   */
  async getCertificate(
    convertId: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    if (!Types.ObjectId.isValid(convertId)) {
      throw new AppError('Invalid convert ID', 400, 'INVALID_ID');
    }
    const user = await User.findById(convertId);
    if (!user || !user.isActive) throw new NotFoundError('Convert', convertId);

    const summary = await progressService.getProgressSummary(convertId);
    const stage = user.currentStage as DiscipleshipStage;
    const eligible = summary.isComplete || COMPLETED_STAGES.includes(stage);
    if (!eligible) {
      throw new AppError(
        'A certificate is available once the class is completed.',
        403,
        'NOT_ELIGIBLE'
      );
    }

    const course = await Course.findOne({ isActive: true });
    const buffer = await this.buildPdf({
      name: `${user.firstName} ${user.lastName}`,
      courseTitle: course?.title || 'Believers Class',
      dateStr: new Date().toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });

    const safeName = `${user.firstName}-${user.lastName}`.replace(/[^a-zA-Z0-9-]/g, '');
    return { buffer, filename: `certificate-${safeName}.pdf` };
  }

  private buildPdf(data: CertificateData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const H = doc.page.height;

      // Border
      doc.save();
      doc.rect(0, 0, W, H).fill('#ffffff');
      doc.lineWidth(6).strokeColor('#1e3a5f').rect(28, 28, W - 56, H - 56).stroke();
      doc.lineWidth(1.5).strokeColor('#c8a15a').rect(40, 40, W - 80, H - 80).stroke();
      doc.restore();

      const cx = W / 2;

      doc.fillColor('#1e3a5f').font('Helvetica-Bold').fontSize(14)
        .text('TEAM BARNABAS MINISTRY', 0, 90, { align: 'center' });

      doc.fillColor('#c8a15a').font('Helvetica-Bold').fontSize(34)
        .text('Certificate of Completion', 0, 130, { align: 'center' });

      doc.fillColor('#555555').font('Helvetica').fontSize(13)
        .text('This certifies that', 0, 195, { align: 'center' });

      doc.fillColor('#1e3a5f').font('Helvetica-Bold').fontSize(30)
        .text(data.name, 0, 220, { align: 'center' });

      // Underline under the name
      const nameWidth = Math.min(420, doc.widthOfString(data.name) + 80);
      doc.lineWidth(1).strokeColor('#c8a15a')
        .moveTo(cx - nameWidth / 2, 268).lineTo(cx + nameWidth / 2, 268).stroke();

      doc.fillColor('#555555').font('Helvetica').fontSize(13)
        .text(`has successfully completed the`, 0, 285, { align: 'center' });

      doc.fillColor('#1e3a5f').font('Helvetica-Bold').fontSize(20)
        .text(`"${data.courseTitle}"`, 0, 308, { align: 'center' });

      doc.fillColor('#555555').font('Helvetica').fontSize(13)
        .text('discipleship programme.', 0, 336, { align: 'center' });

      doc.fillColor('#777777').font('Helvetica').fontSize(12)
        .text(`Awarded on ${data.dateStr}`, 0, 380, { align: 'center' });

      // Signature line
      doc.lineWidth(1).strokeColor('#999999')
        .moveTo(cx - 120, H - 110).lineTo(cx + 120, H - 110).stroke();
      doc.fillColor('#555555').font('Helvetica').fontSize(11)
        .text('Discipleship Coordinator', 0, H - 100, { align: 'center' });

      doc.end();
    });
  }
}

export const certificateService = new CertificateService();
