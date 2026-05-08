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
    name:     { type: String, default: '' },
    email:    { type: String, default: '' },
    phone:    { type: String, default: '' },
    skills:   [{ type: String }],
    summary:  { type: String, default: '' },
    sections: [{ type: String }],
    education: [
      {
        degree:      { type: String, default: '' },
        institution: { type: String, default: '' },
        board:       { type: String, default: '' },
        score:       { type: String, default: '' },
        year:        { type: String, default: '' },
        raw:         { type: String, default: '' },
      },
    ],
    experience: [
      {
        role:         { type: String, default: '' },
        organization: { type: String, default: '' },
        period:       { type: String, default: '' },
      },
    ],
  },

  // ── analysis: matches Aiscorer.js v2 output exactly ──────────────────────
  analysis: {
    success:       { type: Boolean, default: false },
    score:         { type: Number,  default: 0 },      // overall score
    summary:       { type: String,  default: '' },
    selectedJobRole: { type: String, default: '' },
    analyzedAt:    { type: Date },

    // ATS block
    ats: {
      score:   { type: Number, default: 0 },
      verdict: { type: String, default: '' },          // Good / Moderate / Poor
      issues:  [{ type: String }],
    },

    // Section detection (booleans)
    sections: {
      education:      { type: Boolean, default: false },
      experience:     { type: Boolean, default: false },
      skills:         { type: Boolean, default: false },
      projects:       { type: Boolean, default: false },
      certifications: { type: Boolean, default: false },
      summary:        { type: Boolean, default: false },
      achievements:   { type: Boolean, default: false },
    },

    // Keyword analysis
    keywords: {
      matched:         [{ type: String }],
      relatedMatches:  [{ type: String }],
      missing:         [{ type: String }],
      matchPercentage: { type: Number, default: 0 },
      score:           { type: Number, default: 0 },
    },

    // Formatting
    formatting: {
      bulletPointsDetected: { type: Boolean, default: false },
      totalBulletPoints:    { type: Number,  default: 0 },
      avgBulletLength:      { type: Number,  default: 0 },
      readabilityScore:     { type: Number,  default: 0 },
    },

    // Action verbs
    actionVerbs: {
      used:      [{ type: String }],
      count:     { type: Number, default: 0 },
      weakVerbs: [{ type: String }],
    },

    // Text metrics
    metrics: {
      wordCount:           { type: Number, default: 0 },
      sentenceCount:       { type: Number, default: 0 },
      avgWordsPerSentence: { type: Number, default: 0 },
    },

    // Grammar
    grammar: {
      score:  { type: Number, default: 0 },
      issues: [{ type: String }],
    },

    // Missing tech skills
    missingSkills: [{ type: String }],

    // Issues + suggestions
    issues:      [{ type: String }],
    suggestions: [{ type: String }],

    // AI extras (only present when Claude ran)
    strengths:  [{ type: String }],
    weaknesses: [{ type: String }],
  },

  careerGuidance: {
    recommendedCourses:  [{ title: String, platform: String, url: String }],
    recommendedProjects: [{ type: String }],
    skillsToLearn:       [{ type: String }],
    careerPaths:         [{ type: String }],
    generatedAt:         { type: Date },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

resumeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);
