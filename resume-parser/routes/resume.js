// routes/resume.js
// Express router exposing POST /upload — accepts a resume file, parses it,
// and returns clean text ready for AI analysis or further processing.

const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { parseResume } = require("../utils/parser");

// ---------------------------------------------------------------------------
// POST /upload
// ---------------------------------------------------------------------------

/**
 * @route   POST /api/resume/upload
 * @desc    Upload a PDF or DOCX resume, extract and clean its text content.
 * @access  Public
 *
 * Request:  multipart/form-data  { file: <PDF|DOCX> }
 * Response: application/json
 *   Success 200:
 *     {
 *       "success": true,
 *       "data": {
 *         "fileName": "resume.pdf",
 *         "mimeType": "application/pdf",
 *         "fileSizeBytes": 102400,
 *         "wordCount": 450,
 *         "charCount": 2800,
 *         "text": "cleaned extracted text..."
 *       }
 *     }
 *   Error 4xx/5xx:
 *     { "success": false, "error": "<message>" }
 */
router.post(
  "/upload",

  // -- Multer middleware ------------------------------------------------------
  // upload.single("file") processes ONE file from the "file" form-field.
  // If multer rejects the file (wrong type, too large), it calls next(err).
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (!err) return next(); // No multer error -> continue to handler

      // Handle multer-specific errors
      if (err.code === "LIMIT_FILE_SIZE") {
        console.warn("[Route] File rejected -- exceeds 5 MB size limit");
        return res.status(413).json({
          success: false,
          error: "File is too large. Maximum allowed size is 5 MB.",
        });
      }

      if (err.code === "UNSUPPORTED_FILE_TYPE") {
        console.warn(`[Route] File rejected -- unsupported type: ${err.message}`);
        return res.status(415).json({
          success: false,
          error: err.message,
        });
      }

      // Unexpected multer error
      console.error("[Route] Unexpected multer error:", err);
      return res.status(500).json({
        success: false,
        error: "File upload failed due to an internal error.",
      });
    });
  },

  // -- Route handler ----------------------------------------------------------
  async (req, res) => {
    console.log("[Route] POST /api/resume/upload received");

    // Guard: no file attached to the request
    if (!req.file) {
      console.warn("[Route] No file found in request");
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please attach a file using the "file" form-data field.',
      });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    console.log(
      `[Route] Processing file: "${originalname}" | MIME: ${mimetype} | Size: ${size} bytes`
    );

    // -- Parse the file -------------------------------------------------------
    let parseResult;
    try {
      parseResult = await parseResume(buffer, mimetype);
    } catch (parseErr) {
      console.error(`[Route] Parsing error for "${originalname}":`, parseErr.message);
      return res.status(422).json({
        success: false,
        error: parseErr.message,
      });
    }

    const { text, wordCount, charCount } = parseResult;

    // Guard: parser returned empty text
    if (!text || text.length === 0) {
      console.warn(`[Route] Parser returned empty text for "${originalname}"`);
      return res.status(422).json({
        success: false,
        error: "Could not extract any readable text from the uploaded file.",
      });
    }

    console.log(`[Route] Successfully parsed "${originalname}" -- returning response`);

    // -- Success response ------------------------------------------------------
    return res.status(200).json({
      success: true,
      data: {
        fileName: originalname,
        mimeType: mimetype,
        fileSizeBytes: size,
        wordCount,
        charCount,
        text,
      },
    });
  }
);

module.exports = router;
