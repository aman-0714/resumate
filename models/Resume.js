// models/Resume.js
const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileName:    { type: String, required: true },
  filePath:    { type: String, required: true },
  fileType:    { type: String, enum: ['pdf', 'doc', 'docx'], required: true },
  fileSize:    { type: Number },
  rawText:     { type: String, default: '' },
  parsedData: {
    name:        { type: String, default: '' },
    email:       { type: String, default: '' },
    phone:       { type: String, default: '' },
    skills:      [{ type: String }],
    education:   [{ type: String }],
    experience:  [{ type: String }],
    summary:     { type: String, default: '' },
    sections:    [{ type: String }],
  },
  analysis: {
    overallScore:      { type: Number, default: 0 },
    atsScore:          { type: Number, default: 0 },
    keywordScore:      { type: Number, default: 0 },
    structureScore:    { type: Number, default: 0 },
    skillsScore:       { type: Number, default: 0 },
    experienceScore:   { type: Number, default: 0 },
    grammarScore:      { type: Number, default: 0 },
    selectedJobRole:   { type: String, default: '' },
    suggestions:       [{ type: String }],
    missingKeywords:   [{ type: String }],
    matchedKeywords:   [{ type: String }],
    strengths:         [{ type: String }],
    weaknesses:        [{ type: String }],
    detailedFeedback:  { type: String, default: '' },
    analyzedAt:        { type: Date },
  },
  careerGuidance: {
    recommendedCourses:   [{ title: String, platform: String, url: String }],
    recommendedProjects:  [{ type: String }],
    skillsToLearn:        [{ type: String }],
    careerPaths:          [{ type: String }],
    generatedAt:          { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

resumeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);
