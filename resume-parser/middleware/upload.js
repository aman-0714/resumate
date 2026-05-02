// middleware/upload.js
// Handles file upload configuration using multer with memory storage

const multer = require("multer");

// Allowed MIME types for resume uploads
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// File size limit: 5MB in bytes
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Multer file filter — rejects files that are not PDF or DOCX.
 * Called for every incoming file before it reaches storage.
 */
const fileFilter = (req, file, cb) => {
  console.log(`[Upload] Incoming file: "${file.originalname}" | MIME: ${file.mimetype}`);

  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    console.log(`[Upload] File type accepted: ${file.mimetype}`);
    cb(null, true); // Accept the file
  } else {
    console.warn(`[Upload] Rejected unsupported file type: ${file.mimetype}`);
    // Pass a typed error so the route handler can distinguish it
    const err = new Error(
      `Unsupported file type: "${file.mimetype}". Only PDF and DOCX files are accepted.`
    );
    err.code = "UNSUPPORTED_FILE_TYPE";
    cb(err, false);
  }
};

/**
 * Multer instance configured with:
 *  - memoryStorage: file bytes live in req.file.buffer (no disk writes)
 *  - fileFilter:    rejects non-PDF/DOCX before upload completes
 *  - limits:        caps payload at 5 MB
 */
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

module.exports = upload;
