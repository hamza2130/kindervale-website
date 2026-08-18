import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

dotenv.config({path: path.resolve(process.cwd(), '.env')});
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {v2 as cloudinary} from 'cloudinary';
import {PrismaClient} from '@prisma/client';
import {processAdmissionSubmission} from './server/services/admissionWorkflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const prisma = new PrismaClient();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 8 * 1024 * 1024},
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(new Error('Invalid image type'));
    cb(null, true);
  }
});
const admissionPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 3 * 1024 * 1024},
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(new Error('Invalid student photo type'));
    cb(null, true);
  }
});

const PORT = Number(process.env.PORT || 8000);
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
const hasCloudinary = Boolean(process.env.CLOUDINARY_URL);
const PRINCIPAL_EMAIL = (process.env.PRINCIPAL_EMAIL || '').trim();

if (!PRINCIPAL_EMAIL) {
  console.warn('[startup] PRINCIPAL_EMAIL is not configured. Admission emails will fail until it is set.');
}

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({origin: true, credentials: true}));
app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname));

app.get(['/', '/levels/:slug'], (req, res) => {
  res.sendFile(path.join(__dirname, 'kindervale.html'));
});

const admissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

function cleanString(value, max = 1000) {
  if (typeof value !== 'string') return undefined;
  return value.replace(/[<>]/g, '').trim().slice(0, max) || undefined;
}

function requiredString(body, key, label) {
  const value = cleanString(body[key], 255);
  if (!value) throw Object.assign(new Error(`${label} is required.`), {status: 400});
  return value;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : cleanString(req.query.token, 2048);
  if (!token) return res.status(401).json({error: 'Authentication required'});
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Role normalization to avoid strict-mismatch issues with enum serialization
    const role = decoded?.role == null ? '' : String(decoded.role);
    if (role.toLowerCase() !== 'admin') {
      return res.status(403).json({error: 'Admin access required'});
    }

    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({error: 'Invalid token'});
  }
}

async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await prisma.adminUser.findUnique({where: {email}});
  if (existing) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({data: {email, passwordHash}});
}

function serializeImage(image) {
  return {
    id: image.id,
    title: image.title,
    description: image.description,
    imageUrl: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl,
    uploadDate: image.uploadDate,
    sortOrder: image.sortOrder,
    featured: image.featured,
    category: image.category
  };
}

app.get('/api/health', (req, res) => {
  res.json({ok: true});
});

app.post('/api/admin/login', adminLimiter, async (req, res, next) => {
  try {
    const email = requiredString(req.body, 'email', 'Email').toLowerCase();
    const password = requiredString(req.body, 'password', 'Password');
    const user = await prisma.adminUser.findUnique({where: {email}});
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({error: 'Invalid email or password'});
    }
    const token = jwt.sign({sub: user.id, email: user.email, role: user.role}, JWT_SECRET, {expiresIn: '8h'});
    res.json({token, user: {email: user.email, role: user.role}});
  } catch (error) {
    next(error);
  }
});

app.get('/api/gallery', async (req, res, next) => {
  try {
    const categories = await prisma.galleryCategory.findMany({
      orderBy: [{sortOrder: 'asc'}, {name: 'asc'}],
      include: {
        images: {orderBy: [{sortOrder: 'asc'}, {uploadDate: 'desc'}]}
      }
    });
    const images = categories.flatMap(category => category.images.map(image => serializeImage({
      ...image,
      category: {id: category.id, name: category.name, sortOrder: category.sortOrder, coverImageId: category.coverImageId}
    })));
    res.json({categories, images});
  } catch (error) {
    next(error);
  }
});

app.post('/api/gallery/categories', auth, async (req, res, next) => {
  try {
    const name = requiredString(req.body, 'name', 'Category name');
    const category = await prisma.galleryCategory.create({
      data: {
        name,
        description: cleanString(req.body.description),
        sortOrder: Number(req.body.sortOrder || 0)
      }
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/gallery/categories/:id', auth, async (req, res, next) => {
  try {
    const category = await prisma.galleryCategory.update({
      where: {id: req.params.id},
      data: {
        name: cleanString(req.body.name, 255),
        description: cleanString(req.body.description),
        sortOrder: req.body.sortOrder === undefined ? undefined : Number(req.body.sortOrder),
        coverImageId: cleanString(req.body.coverImageId, 255)
      }
    });
    res.json(category);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/gallery/categories/:id', auth, async (req, res, next) => {
  try {
    await prisma.galleryCategory.delete({where: {id: req.params.id}});
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/gallery/images', auth, upload.single('image'), async (req, res, next) => {
  try {
    const title = requiredString(req.body, 'title', 'Image title');
    const categoryId = requiredString(req.body, 'categoryId', 'Category');

    // Fail fast if category is invalid
    const categoryExists = await prisma.galleryCategory.findUnique({ where: { id: categoryId } });
    if (!categoryExists) throw Object.assign(new Error('Selected category does not exist.'), { status: 400 });

    let imageUrl = cleanString(req.body.imageUrl, 2048);
    let thumbnailUrl = cleanString(req.body.thumbnailUrl, 2048);

    if (req.file) {
      if (!hasCloudinary) throw Object.assign(new Error('Cloud storage is not configured.'), {status: 500});

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {folder: 'kindervale/gallery', resource_type: 'image'},
          (error, uploadResult) => error ? reject(error) : resolve(uploadResult)
        );
        stream.end(req.file.buffer);
      });

      imageUrl = result.secure_url;
      thumbnailUrl = cloudinary.url(result.public_id, {
        width: 420,
        height: 420,
        crop: 'fill',
        gravity: 'auto',
        secure: true
      });
    }

    if (!imageUrl) throw Object.assign(new Error('An image file or image URL is required.'), {status: 400});

    const image = await prisma.galleryImage.create({
      data: {
        title,
        description: cleanString(req.body.description),
        imageUrl,
        thumbnailUrl,
        categoryId,
        sortOrder: Number(req.body.sortOrder || 0),
        featured: req.body.featured === 'true' || req.body.featured === true
      },
      include: {category: true}
    });

    res.status(201).json(serializeImage(image));
  } catch (error) {
    // Ensure Multer/fileFilter errors return clean 400s
    if (error?.message?.toLowerCase?.().includes('invalid image type')) {
      error.status = 415;
    }
    next(error);
  }
});

app.patch('/api/gallery/images/:id', auth, async (req, res, next) => {
  try {
    const image = await prisma.galleryImage.update({
      where: {id: req.params.id},
      data: {
        title: cleanString(req.body.title, 255),
        description: cleanString(req.body.description),
        imageUrl: cleanString(req.body.imageUrl, 2048),
        thumbnailUrl: cleanString(req.body.thumbnailUrl, 2048),
        categoryId: cleanString(req.body.categoryId, 255),
        sortOrder: req.body.sortOrder === undefined ? undefined : Number(req.body.sortOrder),
        featured: req.body.featured === undefined ? undefined : Boolean(req.body.featured)
      },
      include: {category: true}
    });
    res.json(serializeImage(image));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/gallery/images/:id', auth, async (req, res, next) => {
  try {
    await prisma.galleryImage.delete({where: {id: req.params.id}});
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/gallery/reorder', auth, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    await prisma.$transaction(items.map(item => prisma.galleryImage.update({
      where: {id: item.id},
      data: {sortOrder: Number(item.sortOrder || 0)}
    })));
    res.json({ok: true});
  } catch (error) {
    next(error);
  }
});

const admissionSubmitDedupe = new Map(); // fingerprint -> {expiresAt}

function nowMs() { return Date.now(); }
function fingerprintAdmission(body) {
  const studentName = cleanString(body['student-name'], 255) || '';
  const dob = body['date-of-birth'] ? String(body['date-of-birth']) : '';
  const admittedIn = cleanString(body['admitted-in'], 255) || '';
  const fatherEmail = cleanString(body['father-guardian-email-address'], 255) || '';
  const motherEmail = cleanString(body['mother-guardian-email-address'], 255) || '';
  const email = fatherEmail || motherEmail;
  const fatherPhone = cleanString(body['father-guardian-contact-number'], 80) || '';
  const motherPhone = cleanString(body['mother-guardian-contact-number'], 80) || '';
  const phone = fatherPhone || motherPhone;

  // Coarse time bucket reduces false positives for later different submissions.
  const bucket = Math.floor(nowMs() / (10 * 60 * 1000)); // 10 minutes
  const raw = [studentName, dob, admittedIn, email, phone, bucket].join('|');

  // Simple non-crypto hash to keep it dependency-free.
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return String(hash);
}

app.post('/api/admissions', admissionLimiter, admissionPhotoUpload.single('student-photo'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const fingerprint = fingerprintAdmission(body);
    const existing = admissionSubmitDedupe.get(fingerprint);
    if (existing && existing.expiresAt > nowMs()) {
      return res.status(409).json({success: false, message: 'Duplicate submission detected. Please wait a moment and try again.'});
    }
    admissionSubmitDedupe.set(fingerprint, {expiresAt: nowMs() + 10 * 60 * 1000});

    const admission = await processAdmissionSubmission({prisma, body, photo: req.file, projectRoot: __dirname});

    for (const [key, value] of admissionSubmitDedupe.entries()) {
      if (value.expiresAt <= nowMs()) admissionSubmitDedupe.delete(key);
    }

    res.status(201).json({success: true, message: 'Admission form submitted successfully.', admissionId: admission.id});
  } catch (error) {
    if (error?.message?.toLowerCase?.().includes('student photo')) error.status = 415;
    if (error?.code === 'LIMIT_FILE_SIZE') {
      error.status = 413;
      error.message = 'Student photograph must be smaller than 3 MB.';
    }
    next(error);
  }
});

app.post('/api/admission', admissionLimiter, admissionPhotoUpload.single('student-photo'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const fingerprint = fingerprintAdmission(body);
    const existing = admissionSubmitDedupe.get(fingerprint);
    if (existing && existing.expiresAt > nowMs()) {
      return res.status(409).json({success: false, message: 'Duplicate submission detected. Please wait a moment and try again.'});
    }
    admissionSubmitDedupe.set(fingerprint, {expiresAt: nowMs() + 10 * 60 * 1000});
    const admission = await processAdmissionSubmission({prisma, body, photo: req.file, projectRoot: __dirname});
    for (const [key, value] of admissionSubmitDedupe.entries()) {
      if (value.expiresAt <= nowMs()) admissionSubmitDedupe.delete(key);
    }
    res.status(201).json({success: true, message: 'Admission form submitted successfully.', admissionId: admission.id});
  } catch (error) {
    if (error?.message?.toLowerCase?.().includes('student photo')) error.status = 415;
    if (error?.code === 'LIMIT_FILE_SIZE') {
      error.status = 413;
      error.message = 'Student photograph must be smaller than 3 MB.';
    }
    next(error);
  }
});

app.get('/api/admissions', auth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const search = cleanString(req.query.search, 255);
    const status = cleanString(req.query.status, 40);
    const where = {
      ...(status ? {status} : {}),
      ...(search ? {
        OR: [
          {studentName: {contains: search, mode: 'insensitive'}},
          {fatherName: {contains: search, mode: 'insensitive'}},
          {motherName: {contains: search, mode: 'insensitive'}},
          {primaryPhone: {contains: search, mode: 'insensitive'}},
          {primaryEmail: {contains: search, mode: 'insensitive'}}
        ]
      } : {})
    };
    const [total, admissions] = await Promise.all([
      prisma.admission.count({where}),
      prisma.admission.findMany({
        where,
        orderBy: {submissionDate: 'desc'},
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    res.json({total, page, pageSize, admissions});
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/admissions', auth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const search = cleanString(req.query.search, 255);
    const status = cleanString(req.query.status, 40);
    const where = {
      ...(status ? {status} : {}),
      ...(search ? {
        OR: [
          {studentName: {contains: search, mode: 'insensitive'}},
          {fatherName: {contains: search, mode: 'insensitive'}},
          {motherName: {contains: search, mode: 'insensitive'}},
          {primaryPhone: {contains: search, mode: 'insensitive'}},
          {primaryEmail: {contains: search, mode: 'insensitive'}}
        ]
      } : {})
    };
    const [total, admissions] = await Promise.all([
      prisma.admission.count({where}),
      prisma.admission.findMany({
        where,
        orderBy: {submissionDate: 'desc'},
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    res.json({total, page, pageSize, admissions});
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/admissions/:id', auth, async (req, res, next) => {
  try {
    const admission = await prisma.admission.findUnique({where: {id: req.params.id}});
    if (!admission) return res.status(404).json({error: 'Admission not found'});
    res.json(admission);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/admissions/:id', auth, async (req, res, next) => {
  try {
    await prisma.admission.delete({where: {id: req.params.id}});
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admissions/:id', auth, async (req, res, next) => {
  try {
    const admission = await prisma.admission.update({
      where: {id: req.params.id},
      data: {
        status: cleanString(req.body.status, 40),
        notes: cleanString(req.body.notes, 4000)
      }
    });
    res.json(admission);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admissions/:id', auth, async (req, res, next) => {
  try {
    await prisma.admission.delete({where: {id: req.params.id}});
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/admissions/export.csv', auth, async (req, res, next) => {
  try {
    const admissions = await prisma.admission.findMany({orderBy: {submissionDate: 'desc'}});
    const rows = [
      ['Submission ID', 'Student Name', 'Status', 'Phone', 'Email', 'Submitted At'],
      ...admissions.map(item => [item.id, item.studentName, item.status, item.primaryPhone || '', item.primaryEmail || '', item.submissionDate.toISOString()])
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="admissions.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

app.get(['/portal', '/portal/', '/portal/login'], (req, res) => {
  res.sendFile(path.join(__dirname, 'kindervale-portal.html'));
});

app.use((error, req, res, next) => {
  // Log full error server-side for debugging
  console.error('[server] request failed:', {
    message: error?.message,
    status: error?.status,
    stack: error?.stack,
    path: req?.path,
    method: req?.method
  });

  const status = error.status || 500;
  const safeMessage = status === 500 ? 'Server error' : error.message;
  res.status(status).json({error: safeMessage});
});

ensureAdminUser()
     .catch(error => console.error('[startup] ensureAdminUser failed (non-fatal):', error?.message))
     .then(() => app.listen(PORT, () => console.log(`Kindervale server running on http://localhost:${PORT}`)))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
