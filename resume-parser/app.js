// app.js
// Express application entry point for the Resume Upload & Parsing service.
// Built for easy extension — plug AI analysis (OpenAI, Claude, etc.) after
// the /upload route returns parsed text.

const express = require("express");
const app = express();

const resumeRoutes = require("./routes/resume");

// ---------------------------------------------------------------------------
// Global Middleware
// ---------------------------------------------------------------------------

// Parse JSON bodies (useful if you add auth/config endpoints later)
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// All resume-related routes live under /api/resume
app.use("/api/resume", resumeRoutes);

// Health-check endpoint — handy for Docker, load balancers, CI pipelines
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
// Catches anything not handled by individual route error blocks.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[App] Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "An unexpected server error occurred.",
  });
});

// ---------------------------------------------------------------------------
// Server Bootstrap
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[App] Resume Parser service running on http://localhost:${PORT}`);
  console.log(`[App] Upload endpoint: POST http://localhost:${PORT}/api/resume/upload`);
  console.log(`[App] Health check:    GET  http://localhost:${PORT}/health`);
});

module.exports = app; // Export for testing (Jest, Supertest, etc.)
