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

function drawField(page, font, label, value, x, y, options = {}) {
  const { labelWidth = 110, valueWidth = 220, size = 10 } = options;
  page.drawText(label, { x, y, size, font, color: rgb(0.15, 0.15, 0.15) });
  page.drawLine({
    start: { x: x + labelWidth, y: y + 2 },
    end: { x: x + labelWidth + valueWidth, y: y + 2 },
    thickness: 0.4,
    color: rgb(0.55, 0.55, 0.55)
  });
  page.drawText(safeText(value, ' '), {
    x: x + labelWidth + 4,
    y: y + 1,
    size,
    font,
    color: rgb(0.05, 0.05, 0.05)
  });
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

export async function generateAdmissionPDF(data, options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const templatePath = options.templatePath || path.join(projectRoot, 'admission-form.pdf');
  const uploadDir = options.uploadDir || path.join(projectRoot, 'uploads', 'admissions');
  await fs.mkdir(uploadDir, { recursive: true });

  const templateBytes = await fs.readFile(templatePath);
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm?.();
  if (form) {
    try {
      const fields = form.getFields();
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
    } catch (error) {
      // Keep the fallback overlay path working even if the template lacks usable fields.
    }
  }
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const first = pages[0];
  const second = pages[1] || pages[0];

  // Stamp the form with readable values while preserving the original layout.
  drawField(first, font, 'Student Name', data.studentName, 20, 705, { labelWidth: 92, valueWidth: 300 });
  drawField(first, font, 'Date of Birth', data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-GB') : '', 380, 705, { labelWidth: 84, valueWidth: 120 });
  drawField(first, font, 'Admitted In', data.classApplyingFor || data.admittedIn, 20, 660, { labelWidth: 78, valueWidth: 170 });
  drawField(first, font, 'Gender', data.gender, 200, 660, { labelWidth: 52, valueWidth: 90 });
  drawField(first, font, 'Father/Guardian', data.fatherName, 20, 555, { labelWidth: 110, valueWidth: 200 });
  drawField(first, font, 'Mother/Guardian', data.motherName, 300, 555, { labelWidth: 112, valueWidth: 200 });
  drawField(first, font, 'Postal Address', data.address, 20, 525, { labelWidth: 100, valueWidth: 465 });
  drawField(first, font, 'City', data.city, 20, 495, { labelWidth: 40, valueWidth: 150 });
  drawField(first, font, 'Contact Number', data.primaryPhone, 20, 465, { labelWidth: 102, valueWidth: 200 });
  drawField(first, font, 'Email Address', data.primaryEmail, 20, 435, { labelWidth: 92, valueWidth: 240 });
  drawField(first, font, 'Guardian Phone', data.guardianPhone, 300, 465, { labelWidth: 100, valueWidth: 170 });
  drawField(first, font, 'Emergency Name', data.emergencyName, 20, 300, { labelWidth: 104, valueWidth: 180 });
  drawField(first, font, 'Emergency Phone', data.emergencyPhone, 300, 300, { labelWidth: 106, valueWidth: 170 });

  const medicalLines = splitLines(data.medicalInfo, 90);
  first.drawText('Medical Information', { x: 20, y: 380, size: 10, font: bold, color: rgb(0.12, 0.12, 0.12) });
  medicalLines.slice(0, 3).forEach((line, index) => {
    first.drawText(line, { x: 25, y: 360 - index * 14, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
  });
  first.drawText('Previous School: ' + safeText(data.previousSchool, '-'), { x: 20, y: 330, size: 9, font, color: rgb(0.1, 0.1, 0.1) });

  second.drawText('Parent Signature', { x: 95, y: 160, size: 10, font: bold, color: rgb(0.12, 0.12, 0.12) });
  second.drawText(safeText(data.fatherName || data.motherName, 'Principal copy'), { x: 100, y: 145, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
  second.drawText('Submitted by website workflow', { x: 20, y: 250, size: 8, font, color: rgb(0.35, 0.35, 0.35) });

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

export async function sendAdmissionEmail(data) {
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

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await mailer.send({
        to: principalEmail,
        subject,
        html
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
     try {
       const generated = await generateAdmissionPDF(data, { projectRoot });
       await prisma.admission.update({
         where: { id: created.id },
         data: { pdfPath: generated.filePath }
       });
     } catch (pdfError) {
       console.error('[admission] PDF generation failed (non-fatal):', pdfError?.message);
     }

     try {
       await sendAdmissionEmail(data);
     } catch (emailError) {
       console.error('[admission] Email delivery failed (non-fatal):', emailError?.message);
     }

     return created;
}
