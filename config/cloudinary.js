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

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const memoryUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: _fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  upload = {
    single: (fieldName) => {
      const mid = memoryUpload.single(fieldName);
      return (req, res, next) => {
        mid(req, res, async (err) => {
          if (err) return next(err);
          if (!req.file) return next();

          try {
            const isImage = req.file.mimetype.startsWith('image/');
            const resourceType = isImage ? 'image' : 'raw';
            const result = await uploadBufferToCloudinary(req.file.buffer, {
              folder: `postvisit/reports/${req.user.id}`,
              resource_type: resourceType,
              public_id: `report_${Date.now()}`,
            });

            req.file.path = result.secure_url;
            req.file.filename = result.public_id;
            req.file.resourceType = resourceType;
            req.file.size = req.file.size || result.bytes;
            next();
          } catch (uploadError) {
            next(uploadError);
          }
        });
      };
    },
  };

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
            const diskFilename = req.file.filename;
            req.file.localPath = req.file.path;
            req.file.path = `/uploads/${diskFilename}`;
            req.file.filename = `local_${diskFilename}`;
          }
          next();
        });
      };
    },
  };

  getSignedUrl = (publicId) => {
    if (!publicId) return publicId;
    if (publicId.startsWith('local_')) return `/uploads/${publicId.slice('local_'.length)}`;
    return publicId;
  };
  deleteFile = async (publicId) => {
    try {
      if (!publicId) return;
      const filename = publicId.startsWith('local_')
        ? publicId.slice('local_'.length)
        : publicId.replace(/^\/?uploads[\\/]/, '');
      const filePath = path.join(uploadDir, path.basename(filename));
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

function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

module.exports = { upload, cloudinary, getSignedUrl, deleteFile, HAS_CLOUDINARY };
