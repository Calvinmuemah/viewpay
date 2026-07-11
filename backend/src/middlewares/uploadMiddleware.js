const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const logger = require('../config/logger');

// Set up memory storage
const storage = multer.memoryStorage();

// File filter to restrict uploads to images and videos
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/ogg'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP images and MP4, MOV, MPEG, OGG videos are allowed.'), false);
  }
};

// Multer upload config (limit file size to 10MB)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Upload single file buffer to Cloudinary
 * @param {Object} file - Express file object from multer
 * @returns {Promise<Object>} Cloudinary upload response
 */
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'viewpay_ads',
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary stream upload failed:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    // Write file buffer to Cloudinary stream
    uploadStream.end(file.buffer);
  });
};

module.exports = {
  upload,
  uploadToCloudinary
};
