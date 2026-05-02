// utils/resumeParser.js
const pdfParse = require('pdf-parse');
const fs = require('fs');

/**
 * Extract raw text from a PDF file
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
 * Extract email from text
 * Cleans concatenated label prefixes (e.g. "Engineeringfoo@bar.com" → "foo@bar.com")
 */
const extractEmail = (text) => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  if (!matches) return '';

  // Strip common label prefixes that get concatenated in PDFs
  const labelPrefixes = /^(Email|Mail|Contact|Phone|Address|Engineering|Education|Name|LinkedIn|Github|Website)+/i;

  const cleaned = matches.map(m => {
    const [local, domain] = m.split('@');
    const strippedLocal = local.replace(labelPrefixes, '');
    return strippedLocal.length > 0 ? `${strippedLocal}@${domain}` : m;
  });

  // Return shortest (most likely to be clean)
  return cleaned.sort((a, b) => a.length - b.length)[0];
};

/**
 * Extract phone number — supports Indian (+91) and US formats
 */
const extractPhone = (text) => {
  // Indian mobile: optional +91/91 prefix, then 10 digits starting 6-9
  const indianRegex = /(\+91|91)?[\s\-]?[6-9]\d{9}/g;
  const indianMatches = text.match(indianRegex);
  if (indianMatches) {
    // Return just the 10-digit number, strip prefix/spaces/dashes
    return indianMatches[0].replace(/[\s\-+]/g, '').replace(/^91/, '');
  }

  // US format fallback
  const usRegex = /(\+?1[\s.\-]?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g;
  const usMatches = text.match(usRegex);
  if (usMatches) return usMatches[0].trim();

  return '';
};

/**
 * Extract name — first line that looks like a proper name
 * Strips phone/email fragments that PDF parsers sometimes concatenate
 */
const extractName = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // First pass: strict match — letters/spaces only, must have at least first + last name
  for (const line of lines.slice(0, 8)) {
    if (line.includes('@')) continue;
    if (line.toLowerCase().startsWith('http')) continue;
    if (line.length > 80) continue;

    // Strip trailing phone numbers concatenated to name
    // e.g. "VINAYAK RAI+91-7652921022" or "John Doe | 9999999999"
    let cleaned = line
      .replace(/[\|•·]\s*(\+?91[\s\-]?)?\d[\d\s\-().]{8,}/g, '') // phone after separator
      .replace(/\+91[\s\-]?\d{10}/g, '')                           // +91 phone
      .replace(/\b\d{10}\b/g, '')                                   // bare 10-digit
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Must be 2–60 chars, only letters/spaces/dots/hyphens, contain a space (first + last)
    if (
      cleaned.length >= 2 &&
      cleaned.length <= 60 &&
      /^[A-Za-z\s.\-']+$/.test(cleaned) &&
      cleaned.includes(' ')
    ) {
      return cleaned;
    }
  }

  // Fallback: strip digits and return first reasonable line
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.replace(/(\+?91[\s\-]?)?\d+/g, '').trim();
    if (cleaned.length > 2 && cleaned.length < 60 && /[A-Za-z\s]/.test(cleaned)) {
      return cleaned;
    }
  }

  return '';
};

/**
 * Extract skills from resume text
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
  return [...new Set(found)];
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
 * Extract education entries
 */
const extractEducation = (text) => {
  const degrees = [
    'b.tech', 'b.e.', 'b.sc', 'm.tech', 'm.sc', 'mba', 'phd',
    'bachelor', 'master', 'associate', 'diploma', 'high school',
    'senior secondary', 'matriculation',
  ];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines
    .filter(line =>
      degrees.some(deg => line.toLowerCase().includes(deg)) &&
      line.length > 5
    )
    .slice(0, 5);
};

/**
 * Extract experience lines
 * Picks lines with job role titles or date ranges
 * Excludes education-related lines
 */
const extractExperience = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const rolePattern = /\b(founder|co-founder|president|vice president|lead|head|manager|director|engineer|developer|intern|officer|secretary|coordinator|commander|chief|pathfinder|representative|researcher|assistant)\b/i;

  // Date ranges: "Jan 2024 – Present", "2023 – 2024"
  const dateRangePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)?\s*(19|20)\d{2}\s*(–|-|to)\s*(present|(19|20)\d{2})/i;

  const educationKeywords = [
    'b.tech', 'b.e', 'b.sc', 'm.tech', 'secondary', 'matriculation',
    'cbse', 'cgpa', 'sgpa', 'semester', 'percentage',
  ];

  return lines
    .filter(line => {
      const lower = line.toLowerCase();
      const hasRole = rolePattern.test(line);
      const hasDateRange = dateRangePattern.test(line);
      const isEducation = educationKeywords.some(k => lower.includes(k));
      return (hasRole || hasDateRange) && !isEducation && line.length > 15;
    })
    .slice(0, 12);
};

/**
 * Main parser function
 */
const parseResume = async (filePath, fileType) => {
  let rawText = '';

  if (fileType === 'pdf') {
    rawText = await extractTextFromPDF(filePath);
  } else {
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