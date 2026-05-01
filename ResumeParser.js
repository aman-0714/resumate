// utils/resumeParser.js
const pdfParse = require('pdf-parse');
const fs = require('fs');

/**
 * Extract raw text from a PDF file
 * @param {string} filePath - Absolute path to PDF file
 * @returns {string} - Extracted text
 */
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF parsing error:', error.message);
    throw new Error('Failed to extract text from PDF. File may be corrupted or image-based.');
  }
};

/**
 * Extract email from text using regex
 */
const extractEmail = (text) => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : '';
};

/**
 * Extract phone number from text
 */
const extractPhone = (text) => {
  const phoneRegex = /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g;
  const matches = text.match(phoneRegex);
  return matches ? matches[0].trim() : '';
};

/**
 * Extract name — tries to get first line of resume (most resumes start with name)
 */
const extractName = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // Heuristic: first non-empty line that's not an email/phone/url
  for (const line of lines.slice(0, 5)) {
    if (
      line.length > 2 &&
      line.length < 60 &&
      !line.includes('@') &&
      !line.match(/^\+?\d/) &&
      !line.toLowerCase().startsWith('http')
    ) {
      return line;
    }
  }
  return '';
};

/**
 * Extract skills from resume text
 * Uses a comprehensive tech + soft skills dictionary
 */
const extractSkills = (text) => {
  const lowerText = text.toLowerCase();

  const skillKeywords = [
    // Programming Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
    'typescript', 'go', 'rust', 'scala', 'r', 'matlab', 'perl', 'shell', 'bash',

    // Web Frameworks
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    'laravel', 'rails', 'next.js', 'nuxt', 'fastapi', 'nestjs',

    // Databases
    'mongodb', 'mysql', 'postgresql', 'redis', 'sqlite', 'cassandra', 'oracle',
    'firebase', 'dynamodb', 'elasticsearch',

    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
    'gitlab', 'ci/cd', 'terraform', 'ansible', 'linux', 'nginx',

    // Data Science & AI
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas',
    'numpy', 'scikit-learn', 'keras', 'nlp', 'computer vision', 'data analysis',

    // Other Tech
    'rest api', 'graphql', 'microservices', 'agile', 'scrum', 'jira', 'html',
    'css', 'sass', 'tailwind', 'bootstrap', 'figma', 'photoshop',

    // Soft Skills
    'leadership', 'communication', 'teamwork', 'problem solving', 'project management',
    'time management', 'critical thinking', 'adaptability', 'creativity',
  ];

  const found = skillKeywords.filter(skill => lowerText.includes(skill));
  return [...new Set(found)]; // deduplicate
};

/**
 * Detect resume section headings
 */
const detectSections = (text) => {
  const sectionKeywords = [
    'experience', 'education', 'skills', 'projects', 'certifications',
    'summary', 'objective', 'publications', 'awards', 'languages',
    'volunteer', 'interests', 'references', 'achievements', 'training',
  ];

  const lowerText = text.toLowerCase();
  return sectionKeywords.filter(section => lowerText.includes(section));
};

/**
 * Extract education entries (rough heuristic)
 */
const extractEducation = (text) => {
  const degrees = ['b.tech', 'b.e.', 'b.sc', 'm.tech', 'm.sc', 'mba', 'phd',
                   'bachelor', 'master', 'associate', 'diploma', 'high school'];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.filter(line =>
    degrees.some(deg => line.toLowerCase().includes(deg))
  ).slice(0, 5);
};

/**
 * Extract experience lines (lines with years/job patterns)
 */
const extractExperience = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const yearPattern = /\b(19|20)\d{2}\b/;
  return lines.filter(line => yearPattern.test(line) && line.length > 20).slice(0, 10);
};

/**
 * Main parser function — orchestrates all extractions
 * @param {string} filePath
 * @param {string} fileType - 'pdf', 'doc', 'docx'
 */
const parseResume = async (filePath, fileType) => {
  let rawText = '';

  if (fileType === 'pdf') {
    rawText = await extractTextFromPDF(filePath);
  } else {
    // For DOC/DOCX — in production use mammoth or docx package
    // For now we read as text (works for simple DOCX)
    try {
      rawText = fs.readFileSync(filePath, 'utf8');
    } catch {
      rawText = 'Unable to parse DOC/DOCX. Please upload a PDF for best results.';
    }
  }

  const parsedData = {
    name:       extractName(rawText),
    email:      extractEmail(rawText),
    phone:      extractPhone(rawText),
    skills:     extractSkills(rawText),
    education:  extractEducation(rawText),
    experience: extractExperience(rawText),
    summary:    '',
    sections:   detectSections(rawText),
  };

  return { rawText, parsedData };
};

module.exports = { parseResume, extractSkills, detectSections };