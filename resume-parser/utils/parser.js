// utils/parser.js
// Handles text extraction from PDF and DOCX file buffers.
// Designed to be AI-pipeline-friendly: returns clean plain text ready for LLM ingestion.

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

// ---------------------------------------------------------------------------
// Text Cleaning
// ---------------------------------------------------------------------------

/**
 * Cleans raw extracted text for downstream processing (display, AI analysis, etc.).
 *
 * Rules applied:
 *  1. Normalize all whitespace sequences (tabs, multiple spaces) -> single space
 *  2. Collapse 3+ consecutive newlines -> two newlines (preserve paragraph breaks)
 *  3. Strip characters that are not alphanumeric, basic punctuation, or email-safe
 *  4. Trim leading/trailing whitespace on every line
 *  5. Final trim of the entire string
 *
 * @param {string} rawText - Text as extracted from the file
 * @returns {string} - Cleaned, normalized text
 */
const cleanText = (rawText) => {
  let text = rawText;

  // Step 1: Replace tabs and non-newline whitespace with a single space
  text = text.replace(/[^\S\n]+/g, " ");

  // Step 2: Collapse excessive blank lines (3+ newlines -> 2)
  text = text.replace(/\n{3,}/g, "\n\n");

  // Step 3: Remove characters outside the allowed set.
  // Kept: letters, digits, whitespace (incl. newlines), and punctuation
  // useful in resumes: . , : ; ! ? @ # & ( ) - _ + = / ' " %
  text = text.replace(/[^\w\s.,;:!?@#&()\-_+=/'"%\n]/g, "");

  // Step 4: Trim trailing spaces on each line
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  // Step 5: Final trim
  text = text.trim();

  return text;
};

// ---------------------------------------------------------------------------
// PDF Parser
// ---------------------------------------------------------------------------

/**
 * Extracts plain text from a PDF buffer using pdf-parse.
 *
 * @param {Buffer} buffer - Raw bytes of the uploaded PDF
 * @returns {Promise<string>} - Cleaned plain text
 * @throws {Error} - If parsing fails or the result is empty
 */
const parsePdf = async (buffer) => {
  console.log("[Parser] Starting PDF extraction...");

  let result;
  try {
    result = await pdfParse(buffer);
  } catch (err) {
    console.error("[Parser] pdf-parse threw an error:", err.message);
    throw new Error(`PDF parsing failed: ${err.message}`);
  }

  const rawText = result?.text ?? "";
  console.log(`[Parser] PDF raw text length: ${rawText.length} characters`);

  if (!rawText.trim()) {
    throw new Error(
      "The PDF appears to be empty or contains only non-extractable content (e.g. scanned image)."
    );
  }

  const cleaned = cleanText(rawText);
  console.log(`[Parser] PDF cleaned text length: ${cleaned.length} characters`);
  return cleaned;
};

// ---------------------------------------------------------------------------
// DOCX Parser
// ---------------------------------------------------------------------------

/**
 * Extracts plain text from a DOCX buffer using mammoth.
 * Uses extractRawText to avoid any HTML output.
 *
 * @param {Buffer} buffer - Raw bytes of the uploaded DOCX
 * @returns {Promise<string>} - Cleaned plain text
 * @throws {Error} - If parsing fails or the result is empty
 */
const parseDocx = async (buffer) => {
  console.log("[Parser] Starting DOCX extraction...");

  let result;
  try {
    // mammoth expects { buffer } not a raw Buffer
    result = await mammoth.extractRawText({ buffer });
  } catch (err) {
    console.error("[Parser] mammoth threw an error:", err.message);
    throw new Error(`DOCX parsing failed: ${err.message}`);
  }

  // Log any mammoth warnings (e.g. unsupported features) - non-fatal
  if (result.messages && result.messages.length > 0) {
    result.messages.forEach((msg) =>
      console.warn(`[Parser] mammoth warning [${msg.type}]: ${msg.message}`)
    );
  }

  const rawText = result?.value ?? "";
  console.log(`[Parser] DOCX raw text length: ${rawText.length} characters`);

  if (!rawText.trim()) {
    throw new Error("The DOCX file appears to be empty or contains no readable text.");
  }

  const cleaned = cleanText(rawText);
  console.log(`[Parser] DOCX cleaned text length: ${cleaned.length} characters`);
  return cleaned;
};

// ---------------------------------------------------------------------------
// Unified Entry Point
// ---------------------------------------------------------------------------

/**
 * Dispatches parsing to the correct handler based on MIME type.
 * This is the single function imported by the route layer.
 *
 * Returned object is intentionally structured for easy AI pipeline integration:
 *   { text, wordCount, charCount }
 *
 * @param {Buffer} buffer   - File bytes from multer memoryStorage
 * @param {string} mimeType - MIME type string (e.g. "application/pdf")
 * @returns {Promise<{ text: string, wordCount: number, charCount: number }>}
 * @throws {Error} - Propagates parse errors with descriptive messages
 */
const parseResume = async (buffer, mimeType) => {
  console.log(`[Parser] Dispatching parser for MIME type: ${mimeType}`);

  let text;

  if (mimeType === "application/pdf") {
    text = await parsePdf(buffer);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    text = await parseDocx(buffer);
  } else {
    // Should never reach here because multer fileFilter blocks unknown types,
    // but guard defensively anyway.
    throw new Error(`Unsupported MIME type for parsing: ${mimeType}`);
  }

  // Attach simple metadata useful for AI token-budget decisions
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  console.log(
    `[Parser] Extraction complete -- words: ${wordCount}, chars: ${charCount}`
  );

  return { text, wordCount, charCount };
};

module.exports = { parseResume };
