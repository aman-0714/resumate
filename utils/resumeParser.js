console.log("🔥 NEW PARSER FILE RUNNING");
// utils/resumeParser.js
const pdfParse = require('pdf-parse');
const fs = require('fs');

// ─────────────────────────────────────────────
// 1. PDF TEXT EXTRACTION
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// 2. SECTION SPLITTER
// Splits raw text into named sections by heading detection
// ─────────────────────────────────────────────
const splitIntoSections = (text) => {
  // Headings appear as ALL-CAPS or Title Case on their own line
  const sectionHeadings = [
    'experience', 'work experience', 'professional experience', 'employment',
    'education', 'academic background', 'qualifications',
    'skills', 'technical skills', 'core competencies',
    'projects', 'personal projects', 'academic projects',
    'certifications', 'certificates', 'courses',
    'summary', 'objective', 'profile', 'about me',
    'achievements', 'awards', 'honors',
    'languages', 'interests', 'hobbies',
    'volunteer', 'extracurricular', 'activities',
    'training', 'publications', 'references',
  ];

  const lines = text.split('\n');
  const sections = {};
  let currentSection = 'header';
  sections[currentSection] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const matchedHeading = sectionHeadings.find(h =>
      lower === h || lower.startsWith(h + ' ') || lower.endsWith(' ' + h)
    );

    if (
      matchedHeading &&
      trimmed.length < 60 &&
      // Heading lines are usually short and don't end with punctuation
      !/[,;]$/.test(trimmed)
    ) {
      currentSection = matchedHeading.split(' ')[0]; // normalize to first word
      if (!sections[currentSection]) sections[currentSection] = [];
    } else {
      sections[currentSection].push(trimmed);
    }
  }

  return sections;
};

// ─────────────────────────────────────────────
// 3. NAME
// ─────────────────────────────────────────────
const extractName = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 8)) {
    if (line.includes('@')) continue;
    if (/^https?:\/\//i.test(line)) continue;
    if (line.length > 80) continue;

    // Strip phone numbers concatenated to name
    let cleaned = line
      .replace(/[\|•·]\s*(\+?91[\s\-]?)?\d[\d\s\-().]{8,}/g, '')
      .replace(/\+91[\s\-]?\d{10}/g, '')
      .replace(/\b\d{10}\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (
      cleaned.length >= 2 &&
      cleaned.length <= 60 &&
      /^[A-Za-z\s.\-']+$/.test(cleaned) &&
      cleaned.includes(' ')
    ) {
      return cleaned;
    }
  }

  // Fallback
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.replace(/(\+?91[\s\-]?)?\d+/g, '').trim();
    if (cleaned.length > 2 && cleaned.length < 60 && /[A-Za-z\s]/.test(cleaned)) {
      return cleaned;
    }
  }

  return '';
};

// ─────────────────────────────────────────────
// 4. EMAIL
// ─────────────────────────────────────────────
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

  return cleaned.sort((a, b) => a.length - b.length)[0];
};

// ─────────────────────────────────────────────
// 5. PHONE
// ─────────────────────────────────────────────
const extractPhone = (text) => {
  const indianRegex = /(\+91|91)?[\s\-]?[6-9]\d{9}/g;
  const indianMatches = text.match(indianRegex);
  if (indianMatches) {
    return indianMatches[0].replace(/[\s\-+]/g, '').replace(/^91/, '');
  }
  const usRegex = /(\+?1[\s.\-]?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g;
  const usMatches = text.match(usRegex);
  if (usMatches) return usMatches[0].trim();
  return '';
};

// ─────────────────────────────────────────────
// 6. SKILLS
// ─────────────────────────────────────────────
const extractSkills = (text) => {
  const lowerText = text.toLowerCase();

  const skillKeywords = [
    // Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
    'typescript', 'go', 'rust', 'scala', 'r', 'matlab', 'perl', 'shell', 'bash',
    // Web
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    'laravel', 'rails', 'next.js', 'nuxt', 'fastapi', 'nestjs',
    // Databases
    'mongodb', 'mysql', 'postgresql', 'redis', 'sqlite', 'cassandra', 'oracle',
    'firebase', 'dynamodb', 'elasticsearch',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
    'gitlab', 'ci/cd', 'terraform', 'ansible', 'linux', 'nginx',
    // AI / Data
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas',
    'numpy', 'scikit-learn', 'keras', 'nlp', 'computer vision', 'data analysis',
    // Other
    'rest api', 'graphql', 'microservices', 'agile', 'scrum', 'jira', 'html',
    'css', 'sass', 'tailwind', 'bootstrap', 'figma', 'photoshop',
    // Soft
    'leadership', 'communication', 'teamwork', 'problem solving', 'project management',
    'time management', 'critical thinking', 'adaptability', 'creativity',
  ];

  return [...new Set(skillKeywords.filter(skill => lowerText.includes(skill)))];
};

// ─────────────────────────────────────────────
// 7. EDUCATION  — cleaned & structured
// ─────────────────────────────────────────────
const extractEducation = (text) => {
  const sections = splitIntoSections(text);
  const educationLines = sections['education'] || [];

  // Also scan full text as fallback
  const allLines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const degreeKeywords = [
    'b.tech', 'b.e.', 'b.sc', 'm.tech', 'm.sc', 'mba', 'phd', 'ph.d',
    'bachelor', 'master', 'associate', 'diploma',
    'senior secondary', 'matriculation', 'higher secondary', '12th', '10th',
  ];

  // Merge consecutive lines that belong to the same education entry
  const mergeConsecutive = (lines) => {
    const entries = [];
    let buffer = '';

    for (const line of lines) {
      const lower = line.toLowerCase();
      const hasDegree = degreeKeywords.some(d => lower.includes(d));
      const hasInstitution = /university|institute|school|college|nit|iit|iim/i.test(line);
      const hasYear = /\b(19|20)\d{2}\b/.test(line);
      const hasGrade = /\b(\d{1,2}\.\d{1,2}|\d{2,3}\.?\d*%)\b/.test(line);

      if (hasDegree || hasInstitution) {
        if (buffer) entries.push(cleanEducationEntry(buffer));
        buffer = line;
      } else if (buffer && (hasYear || hasGrade || hasInstitution)) {
        // continuation of current entry
        buffer += ' | ' + line;
      } else if (buffer && line.length < 80) {
        buffer += ' ' + line;
      } else {
        if (buffer) entries.push(cleanEducationEntry(buffer));
        buffer = '';
      }
    }
    if (buffer) entries.push(cleanEducationEntry(buffer));

    return entries.filter(e => e.length > 8);
  };

  const sourceLines = educationLines.length > 1 ? educationLines : allLines.filter(line => {
    const lower = line.toLowerCase();
    return degreeKeywords.some(d => lower.includes(d)) && line.length > 5;
  });

  return mergeConsecutive(sourceLines).slice(0, 6);
};

/**
 * Clean a raw education entry string:
 * - Insert spaces between concatenated words (CamelCase boundaries from PDF)
 * - Normalise separators
 */
const cleanEducationEntry = (entry) => {
  return entry
    // Insert space before capital letters that follow lowercase (PDF concat artifact)
    // e.g. "B.TechCSE" → "B.Tech CSE",  "NITJalandhar" → "NIT Jalandhar"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Insert space between letters and digits run together
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
};

// ─────────────────────────────────────────────
// 8. EXPERIENCE  — cleaned & de-artifacted
// ─────────────────────────────────────────────
const extractExperience = (text) => {
  const sections = splitIntoSections(text);

  // Prefer the dedicated experience section; fall back to full text scan
  const expLines = [
    ...(sections['experience'] || []),
    ...(sections['volunteer'] || []),
    ...(sections['activities'] || []),
    ...(sections['extracurricular'] || []),
  ];

  const rolePattern = /\b(founder|co-founder|president|vice.?president|lead|head|manager|director|engineer|developer|intern|officer|secretary|coordinator|commander|chief|pathfinder|representative|researcher|assistant|mentor)\b/i;
  const dateRangePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)?\s*(19|20)\d{2}\s*(–|-|to)\s*(present|(19|20)\d{2})/i;

  const educationKeywords = [
    'b.tech', 'b.e', 'b.sc', 'm.tech', 'secondary', 'matriculation',
    'cbse', 'cgpa', 'sgpa', 'semester', 'percentage',
  ];

  const clean = (line) =>
    line
      .replace(/^[\s–\-•·▪◦▸►]+/, '')  // strip leading dash/bullet artifacts
      .replace(/([a-z])([A-Z])/g, '$1 $2') // fix CamelCase concat
      .replace(/\s{2,}/g, ' ')
      .trim();

  const seen = new Set();
  const results = [];

  const sourceLines = expLines.length > 2 ? expLines : text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const raw of sourceLines) {
    const line = clean(raw);
    if (!line || line.length < 10) continue;

    const lower = line.toLowerCase();
    const hasRole = rolePattern.test(line);
    const hasDate = dateRangePattern.test(line);
    const isEducation = educationKeywords.some(k => lower.includes(k));

    if ((hasRole || hasDate) && !isEducation && !seen.has(line)) {
      seen.add(line);
      results.push(line);
    }

    if (results.length >= 12) break;
  }

  return results;
};

// ─────────────────────────────────────────────
// 9. SUMMARY
// ─────────────────────────────────────────────
const extractSummary = (text) => {
  const sections = splitIntoSections(text);
  const summaryLines = sections['summary'] || sections['objective'] || sections['profile'] || [];

  if (summaryLines.length > 0) {
    return summaryLines.join(' ').replace(/\s{2,}/g, ' ').trim().slice(0, 600);
  }

  // Fallback: find a multi-word sentence in header area
  const headerLines = (splitIntoSections(text)['header'] || []);
  const sentence = headerLines.find(l => l.split(' ').length > 8 && l.length < 500 && !l.includes('@'));
  return sentence ? sentence.trim().slice(0, 600) : '';
};

// ─────────────────────────────────────────────
// 10. SECTION DETECTION
// ─────────────────────────────────────────────
const detectSections = (text) => {
  const sectionKeywords = [
    'experience', 'education', 'skills', 'projects', 'certifications',
    'summary', 'objective', 'publications', 'awards', 'languages',
    'volunteer', 'interests', 'references', 'achievements', 'training',
  ];
  const lowerText = text.toLowerCase();
  return sectionKeywords.filter(s => lowerText.includes(s));
};

// ─────────────────────────────────────────────
// 11. MAIN EXPORT
// ─────────────────────────────────────────────
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
    summary:    extractSummary(rawText),
    sections:   detectSections(rawText),
  };

  return { rawText, parsedData };
};

module.exports = { parseResume, extractSkills, detectSections };
