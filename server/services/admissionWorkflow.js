import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const admissionSchema = z.object({
  studentName: z.string().trim().min(1).max(255),
  gender: z.string().trim().max(50).optional().or(z.literal('')),
  classApplyingFor: z.string().trim().max(120).optional().or(z.literal('')),
  dateOfBirth: z.string().trim().min(1),
  admittedIn: z.string().trim().max(120).optional().or(z.literal('')),
  fatherName: z.string().trim().max(255).optional().or(z.literal('')),
  motherName: z.string().trim().max(255).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  primaryPhone: z.string().trim().max(80).optional().or(z.literal('')),
  primaryEmail: z.string().trim().email().optional().or(z.literal('')),
  guardianPhone: z.string().trim().max(80).optional().or(z.literal('')),
  emergencyName: z.string().trim().max(255).optional().or(z.literal('')),
  emergencyPhone: z.string().trim().max(80).optional().or(z.literal('')),
  medicalInfo: z.string().trim().max(2000).optional().or(z.literal('')),
  previousSchool: z.string().trim().max(255).optional().or(z.literal('')),
  documents: z.any().optional(),
  formData: z.record(z.any()).optional()
});

function compact(value) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function safeText(value, fallback = '') {
  const text = compact(value);
  return text || fallback;
}

function splitLines(text, maxChars = 58) {
  const words = compact(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function photoExtension(file) {
  const byMime = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'};
  return byMime[file?.mimetype] || path.extname(file?.originalname || '').replace('.', '').toLowerCase() || 'jpg';
}

export async function saveAdmissionPhoto(file, options = {}) {
  if (!file) return null;
  if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype || '')) {
    const error = new Error('Please upload a JPG, JPEG, PNG, or WEBP student photograph.');
    error.status = 415;
    throw error;
  }
  if (file.size > 3 * 1024 * 1024) {
    const error = new Error('Student photograph must be smaller than 3 MB.');
    error.status = 413;
    throw error;
  }

  const projectRoot = options.projectRoot || process.cwd();
  const uploadDir = options.uploadDir || path.join(projectRoot, 'uploads', 'admissions', 'photos');
  await fs.mkdir(uploadDir, { recursive: true });
  const timestamp = options.timestamp || Date.now();
  const ext = photoExtension(file);
  const fileName = `student-photo-${timestamp}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, file.buffer);
  return {
    fileName,
    filePath,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

export function validateAdmissionPayload(body) {
  const payload = {
    studentName: body.studentName || body['student-name'] || '',
    gender: body.gender || '',
    classApplyingFor: body.classApplyingFor || body['admitted-in'] || body['class-applying-for'] || '',
    admissionSource: body.admissionSource || body['admission-source'] || '',
    dateOfBirth: body.dateOfBirth || body['date-of-birth'] || '',
    admittedIn: body.admittedIn || body['admitted-in'] || '',
    fatherName: body.fatherName || body['father-guardian-name'] || '',
    motherName: body.motherName || body['mother-guardian-name'] || '',
    address: body.address || body['father-guardian-postal-address'] || '',
    city: body.city || '',
    primaryPhone: body.primaryPhone || body['father-guardian-contact-number'] || body['mother-guardian-contact-number'] || '',
    primaryEmail: body.primaryEmail || body['father-guardian-email-address'] || body['mother-guardian-email-address'] || '',
    guardianPhone: body.guardianPhone || body['father-guardian-contact-number'] || body['mother-guardian-contact-number'] || '',
    emergencyName: body.emergencyName || body['emergency-1-name'] || '',
    emergencyPhone: body.emergencyPhone || body['emergency-1-contact-number'] || '',
    medicalInfo: body.medicalInfo || body['medical-information'] || '',
    previousSchool: body.previousSchool || body['school-1-name'] || '',
    documents: body.documents,
    formData: body.formData || body
  };

  const parsed = admissionSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Invalid admission submission.';
    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  if (!compact(payload.studentName)) {
    const error = new Error('Student name is required.');
    error.status = 400;
    throw error;
  }

  if (!compact(payload.dateOfBirth)) {
    const error = new Error('Date of birth is required.');
    error.status = 400;
    throw error;
  }

  const date = new Date(payload.dateOfBirth);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Please enter a valid date of birth.');
    error.status = 400;
    throw error;
  }

  return { ...payload, dateOfBirth: date };
}

// ---------------------------------------------------------------------------
// PDF field coordinates
//
// The Kindervale admission-form.pdf template is a *scanned/rasterized* form
// (each page is a single embedded image, there is no real text/AcroForm
// layer), so text has to be overlaid at exact pixel positions rather than
// filled into form fields. These coordinates were measured directly against
// the template: the template was rendered at 300dpi and OCR'd / pixel-scanned
// to find the precise x/y position of every label and its adjacent dotted
// answer line, then converted into PDF points (1pt = 300/72 px, origin at
// bottom-left). If the template PDF is ever redesigned, these values will
// need to be re-measured.
// ---------------------------------------------------------------------------

const PAGE1_FIELDS = {
  studentName: { x0: 60.0, x1: 376.8, y: 695.0, size: 10 },
  dateOfBirth: { x0: 462.0, x1: 576.0, y: 695.0, size: 10 },
  classApplyingFor: { x0: 90.0, x1: 196.8, y: 658.5, size: 9 },
  previousSchool: { x0: 31.2, x1: 157.2, y: 569.7, size: 8 },
  medicalLine1: { x0: 22.8, x1: 576.0, y: 444.0, size: 9 },
  medicalLine2: { x0: 22.8, x1: 576.0, y: 408.9, size: 9 },
  fatherName: { x0: 159.6, x1: 346.8, y: 334.1, size: 9 },
  motherName: { x0: 363.6, x1: 576.0, y: 334.1, size: 9 },
  fatherAddress: { x0: 159.6, x1: 346.8, y: 227.5, size: 8 },
  fatherContact: { x0: 159.6, x1: 346.8, y: 191.5, size: 9 },
  motherContact: { x0: 363.6, x1: 576.0, y: 191.5, size: 9 },
  fatherEmail: { x0: 159.6, x1: 346.8, y: 153.6, size: 8 },
  emergencyName: { x0: 62.4, x1: 259.2, y: 101.7, size: 9 },
  emergencyPhone: { x0: 363.6, x1: 576.0, y: 101.7, size: 9 }
};

const PAGE2_FIELDS = {
  guardianName: { x0: 112.8, x1: 246.0, y: 297.6, size: 9 }
};

function fitTextToWidth(font, text, maxWidth, { startSize = 10, minSize = 6 } = {}) {
  let str = compact(text);
  if (!str) return { text: '', size: startSize };
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(str, size) > maxWidth) {
    size -= 0.5;
  }
  if (font.widthOfTextAtSize(str, size) > maxWidth) {
    while (str.length > 1 && font.widthOfTextAtSize(`${str}\u2026`, size) > maxWidth) {
      str = str.slice(0, -1);
    }
    str = `${str}\u2026`;
  }
  return { text: str, size };
}

// Draws `value` inside the box [x0, x1] on the dotted answer line at `y`,
// shrinking the font (and truncating with an ellipsis as a last resort) so
// it never overflows into the next field.
function drawValue(page, font, value, field) {
  const text = safeText(value, '');
  if (!text || !field) return;
  const { x0, x1, y, size } = field;
  const maxWidth = x1 - x0 - 4;
  const fitted = fitTextToWidth(font, text, maxWidth, { startSize: size, minSize: Math.min(6, size) });
  if (!fitted.text) return;
  page.drawText(fitted.text, {
    x: x0 + 2,
    y,
    size: fitted.size,
    font,
    color: rgb(0.05, 0.05, 0.05)
  });
}

export async function generateAdmissionPDF(data, options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const templatePath = options.templatePath || path.join(projectRoot, 'admission-form.pdf');
  const uploadDir = options.uploadDir || path.join(projectRoot, 'uploads', 'admissions');
  await fs.mkdir(uploadDir, { recursive: true });

  const templateBytes = await fs.readFile(templatePath);
  const pdf = await PDFDocument.load(templateBytes);

  // The template has no real AcroForm fields (it's a scanned image), but in
  // case a future version of the template does, try filling named fields
  // first and only fall back to the pixel-measured overlay below.
  const form = pdf.getForm?.();
  let usedFormFields = false;
  if (form) {
    try {
      const fields = form.getFields();
      if (fields.length) {
        for (const field of fields) {
          const name = field.getName();
          const value = safeText(
            {
              studentName: data.studentName,
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-GB') : '',
              admittedIn: data.classApplyingFor || data.admittedIn,
              admissionSource: data.admissionSource,
              gender: data.gender,
              fatherName: data.fatherName,
              motherName: data.motherName,
              address: data.address,
              city: data.city,
              primaryPhone: data.primaryPhone,
              primaryEmail: data.primaryEmail,
              guardianPhone: data.guardianPhone,
              emergencyName: data.emergencyName,
              emergencyPhone: data.emergencyPhone,
              medicalInfo: data.medicalInfo,
              previousSchool: data.previousSchool
            }[name] || ''
          );
          if ('setText' in field) field.setText(value);
        }
        form.flatten();
        usedFormFields = true;
      }
    } catch (error) {
      // Fall back to the pixel-measured overlay below.
    }
  }

  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const first = pages[0];
  const second = pages[1] || pages[0];

  if (!usedFormFields) {
    const dobText = data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-GB') : '';
    const addressText = [data.address, data.city].filter(compact).join(', ');

    drawValue(first, font, data.studentName, PAGE1_FIELDS.studentName);
    drawValue(first, font, dobText, PAGE1_FIELDS.dateOfBirth);
    drawValue(first, font, data.classApplyingFor || data.admittedIn, PAGE1_FIELDS.classApplyingFor);
    drawValue(first, font, data.previousSchool, PAGE1_FIELDS.previousSchool);

    const medicalLines = splitLines(data.medicalInfo, 100);
    drawValue(first, font, medicalLines[0], PAGE1_FIELDS.medicalLine1);
    if (medicalLines[1]) {
      drawValue(first, font, medicalLines[1], PAGE1_FIELDS.medicalLine2);
    }

    drawValue(first, font, data.fatherName, PAGE1_FIELDS.fatherName);
    drawValue(first, font, data.motherName, PAGE1_FIELDS.motherName);
    drawValue(first, font, addressText, PAGE1_FIELDS.fatherAddress);
    drawValue(first, font, data.primaryPhone, PAGE1_FIELDS.fatherContact);
    drawValue(first, font, data.guardianPhone, PAGE1_FIELDS.motherContact);
    drawValue(first, font, data.primaryEmail, PAGE1_FIELDS.fatherEmail);
    drawValue(first, font, data.emergencyName, PAGE1_FIELDS.emergencyName);
    drawValue(first, font, data.emergencyPhone, PAGE1_FIELDS.emergencyPhone);

    // Printed name on the parent-signature line (page 2); the signature
    // itself is left blank for the parent to sign by hand.
    drawValue(second, font, data.fatherName || data.motherName, PAGE2_FIELDS.guardianName);

    // Small, unobtrusive footer note in the empty margin at the very bottom
    // of page 2, well clear of the office-use section above it.
    second.drawText('Submitted via online admission form', {
      x: 22.8,
      y: 10,
      size: 6,
      font,
      color: rgb(0.55, 0.55, 0.55)
    });
  }

  const timestamp = options.timestamp || Date.now();
  const fileName = `admission-${timestamp}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  const pdfBytes = await pdf.save();
  await fs.writeFile(filePath, pdfBytes);
  return { pdfBytes, filePath, fileName };
}

async function createMailer() {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    return {
      async send({ to, subject, html, attachment }) {
        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Kindervale Admissions <onboarding@resend.dev>',
          to,
          subject,
          html,
          attachments: attachment ? [{ filename: attachment.filename, content: attachment.content }] : []
        });
        if (result.error) throw new Error(result.error.message || 'Resend failed');
        return result;
      }
    };
  }

  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
    return {
      async send({ to, subject, html, attachment }) {
        return transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.SMTP_USER,
          to,
          subject,
          html,
          attachments: attachment ? [{ filename: attachment.filename, content: attachment.content }] : []
        });
      }
    };
  }

  throw new Error('Email service is not configured.');
}

export async function sendAdmissionEmail(data, pdfData) {
  const principalEmail = process.env.PRINCIPAL_EMAIL;
  if (!principalEmail) throw new Error('PRINCIPAL_EMAIL is not configured.');

  const mailer = await createMailer();
  const subject = `New Admission Application - ${safeText(data.studentName, 'Student')}`;
  const submittedAt = new Date().toLocaleString('en-GB');
  const html = `
    <p>A new admission application has been submitted.</p>
    <ul>
      <li><strong>Student Name:</strong> ${safeText(data.studentName)}</li>
      <li><strong>Class Applied:</strong> ${safeText(data.classApplyingFor || data.admittedIn)}</li>
      <li><strong>Parent Name:</strong> ${safeText(data.fatherName || data.motherName)}</li>
      <li><strong>Phone:</strong> ${safeText(data.primaryPhone || data.guardianPhone)}</li>
      <li><strong>Submitted From:</strong> ${safeText(data.admissionSource || 'General Admissions')}</li>
      <li><strong>Submission Time:</strong> ${submittedAt}</li>
    </ul>
  `;

  const attachment = pdfData?.pdfBytes
    ? { filename: pdfData.fileName || 'admission-form.pdf', content: Buffer.from(pdfData.pdfBytes) }
    : undefined;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await mailer.send({
        to: principalEmail,
        subject,
        html,
        attachment
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError || new Error('Email delivery failed.');
}

export async function processAdmissionSubmission({ prisma, body, photo, projectRoot }) {
  const data = validateAdmissionPayload(body);
  const photoData = await saveAdmissionPhoto(photo, { projectRoot });
  const documents = {
    ...(data.documents && typeof data.documents === 'object' && !Array.isArray(data.documents) ? data.documents : {}),
    ...(photoData ? { studentPhoto: photoData } : {})
  };
  const formData = {
    ...(data.formData && typeof data.formData === 'object' && !Array.isArray(data.formData) ? data.formData : body),
    ...(photoData ? { studentPhoto: photoData } : {})
  };
  const created = await prisma.admission.create({
    data: {
      studentName: data.studentName,
      gender: data.gender || null,
      classApplyingFor: data.classApplyingFor || null,
      admissionSource: data.admissionSource || 'General Admissions',
      dateOfBirth: data.dateOfBirth,
      admittedIn: data.admittedIn || null,
      fatherName: data.fatherName || null,
      motherName: data.motherName || null,
      address: data.address || null,
      city: data.city || null,
      primaryPhone: data.primaryPhone || null,
      primaryEmail: data.primaryEmail || null,
      guardianPhone: data.guardianPhone || null,
      emergencyName: data.emergencyName || null,
      emergencyPhone: data.emergencyPhone || null,
      medicalInfo: data.medicalInfo || null,
      previousSchool: data.previousSchool || null,
      documents: Object.keys(documents).length ? documents : null,
      formData,
      status: 'Pending'
    }
  });

  // PDF generation and email are best-effort — the admission record is already saved.
  let pdfData = null;
  try {
    pdfData = await generateAdmissionPDF(data, { projectRoot });
    await prisma.admission.update({
      where: { id: created.id },
      data: { pdfPath: pdfData.filePath }
    });
  } catch (pdfError) {
    console.error('[admission] PDF generation failed (non-fatal):', pdfError?.message);
  }

  try {
    await sendAdmissionEmail(data, pdfData);
  } catch (emailError) {
    console.error('[admission] Email delivery failed (non-fatal):', emailError?.message);
  }

  return created;
}
