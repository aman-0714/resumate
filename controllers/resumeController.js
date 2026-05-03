// controllers/resumeController.js
const path = require('path');
const Resume = require('../models/Resume');
const { parseResume } = require('../utils/resumeParser');

// @POST /api/resume/upload
const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const { rawText, parsedData, meta } = await parseResume(req.file.path, fileExt);

    const resume = await Resume.create({
      user: req.user._id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: fileExt,
      fileSize: req.file.size,
      rawText,
      parsedData,
    });

    res.status(201).json({
      success: true,
      message: 'Resume uploaded and parsed successfully!',
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        fileType: resume.fileType,
        parsedData: resume.parsedData,
        createdAt: resume.createdAt,
      },
      meta,   // confidenceScore, confidenceBreakdown, llmUsed, ocrUsed
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Upload failed.' });
  }
};

// @GET /api/resume/my-resumes
const getMyResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .select('-rawText')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: resumes.length, resumes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch resumes.' });
  }
};

// @GET /api/resume/:id
const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
    res.json({ success: true, resume });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch resume.' });
  }
};

// @DELETE /api/resume/:id
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found.' });
    res.json({ success: true, message: 'Resume deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete resume.' });
  }
};

module.exports = { uploadResume, getMyResumes, getResumeById, deleteResume };
