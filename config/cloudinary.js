/**
 * Cloudinary Configuration
 * Supports Cloudinary cloud storage OR local disk fallback
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const HAS_CLOUDINARY = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let upload, cloudinary, getSignedUrl, deleteFile;

if (HAS_CLOUDINARY) {
  // ---- Cloudinary mode ----
  cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const reportStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const isImage = file.mimetype.startsWith('image/');
      return {
        folder: `postvisit/reports/${req.user.id}`,
        resource_type: isImage ? 'image' : 'raw',
        public_id: `report_${Date.now()}`,
      };
    },
  });

  upload = multer({
    storage: reportStorage,
    fileFilter: _fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  getSignedUrl = (publicId) => {
    try {
      return cloudinary.url(publicId, { secure: true });
    } catch (e) {
      return publicId;
    }
  };

  deleteFile = async (publicId, resourceType = 'raw') => {
    return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  };

} else {
  // ---- Local disk fallback ----
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `report_${Date.now()}${ext}`);
    },
  });

  upload = multer({
    storage: diskStorage,
    fileFilter: _fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // Wrap the multer middleware to attach .path and .filename like Cloudinary does
  const _origUpload = upload;
  upload = {
    single: (fieldName) => {
      const mid = _origUpload.single(fieldName);
      return (req, res, next) => {
        mid(req, res, (err) => {
          if (err) return next(err);
          if (req.file) {
            // Normalize to Cloudinary-style fields
            req.file.path = `/uploads/${req.file.filename}`;
            req.file.filename = `local_${req.file.filename}`;
          }
          next();
        });
      };
    },
  };

  getSignedUrl = (publicId) => publicId; // local path IS the URL
  deleteFile = async (publicId) => {
    try {
      const filePath = path.join(__dirname, '..', 'public', publicId.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { /* ignore */ }
  };

  console.log('📁 Using local disk storage (no Cloudinary credentials found)');
}

function _fileFilter(req, file, cb) {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and images (JPG, PNG, WebP) are allowed'), false);
  }
}

module.exports = { upload, cloudinary, getSignedUrl, deleteFile, HAS_CLOUDINARY };
