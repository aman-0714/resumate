console.log("🔥 PARSER v3 RUNNING");
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
// Splits raw text into named sections by heading detection.
// Returns { sectionName: [lines...] }
// ─────────────────────────────────────────────
const splitIntoSections = (text) => {
  const sectionHeadings = [
    'experience', 'work experience', 'professional experience', 'employment',
    'position of responsibility', 'positions of responsibility',
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

    const matchedHeading = sectionHeadings.find(
      h => lower === h || lower === h + 's'
    );

    if (matchedHeading && trimmed.length < 70 && !/[,;]$/.test(trimmed)) {
      // Map "positions of responsibility" → 'experience'
      const key =
        matchedHeading === 'position of responsibility' ||
        matchedHeading === 'positions of responsibility'
          ? 'experience'
          : matchedHeading.split(' ')[0];
      currentSection = key;
      if (!sections[currentSection]) sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
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
    'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
    'typescript', 'go', 'rust', 'scala', 'r', 'matlab', 'perl', 'shell', 'bash',
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    'laravel', 'rails', 'next.js', 'nuxt', 'fastapi', 'nestjs',
    'mongodb', 'mysql', 'postgresql', 'redis', 'sqlite', 'cassandra', 'oracle',
    'firebase', 'dynamodb', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
    'gitlab', 'ci/cd', 'terraform', 'ansible', 'linux', 'nginx',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas',
    'numpy', 'scikit-learn', 'keras', 'nlp', 'computer vision', 'data analysis',
    'rest api', 'graphql', 'microservices', 'agile', 'scrum', 'jira', 'html',
    'css', 'sass', 'tailwind', 'bootstrap', 'figma', 'photoshop',
    'leadership', 'communication', 'teamwork', 'problem solving', 'project management',
    'time management', 'critical thinking', 'adaptability', 'creativity',
  ];

  return [...new Set(skillKeywords.filter(skill => lowerText.includes(skill)))];
};

// ─────────────────────────────────────────────
// 7. EDUCATION
// FIX: filter table-header rows + properly merge split lines
// ─────────────────────────────────────────────

const cleanEducationEntry = (entry) => {
  return entry
    .replace(/([a-z])([A-Z])/g, '$1 $2')        // "B.TechCSE" → "B.Tech CSE"
    .replace(/([A-Za-z])(\d{4})/g, '$1 $2')      // "Jalandhar2027" → "Jalandhar 2027"
    .replace(/(\d{4})([A-Za-z])/g, '$1 $2')      // "2027NIT" → "2027 NIT"
    .replace(/\s{2,}/g, ' ')
    .trim();
};

// Detect table-header rows like "Degree  Institute  Board  CGPA  Year"
const isTableHeader = (line) => {
  const headerPhrases = [
    'degree institute', 'board university', 'cgpa percentage',
    'degree board', 'institution year', 'qualification board',
    'degree institute board',
  ];
  const lower = line.toLowerCase();
  return headerPhrases.some(p => lower.includes(p));
};

const extractEducation = (text) => {
  const sections = splitIntoSections(text);
  const educationLines = sections['education'] || [];

  const degreeKeywords = [
    'b.tech', 'b.e.', 'b.sc', 'm.tech', 'm.sc', 'mba', 'phd', 'ph.d',
    'bachelor', 'master', 'associate', 'diploma',
    'senior secondary', 'matriculation', 'higher secondary', '12th', '10th',
  ];

  const mergeConsecutive = (lines) => {
    const entries = [];
    let buffer = '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (isTableHeader(line)) continue;   // ← skip "Degree  Institute  Board..." rows

      const lower = line.toLowerCase();
      const hasDegree = degreeKeywords.some(d => lower.includes(d));
      const hasInstitution = /university|institute|school|college|nit\b|iit\b|iim\b/i.test(line);
      const hasYear = /\b(19|20)\d{2}\b/.test(line);
      const hasGrade = /\b(\d{1,2}\.\d{1,2}|\d{2,3}\.?\d*%)\b/.test(line);

      if (hasDegree || (hasInstitution && !buffer)) {
        if (buffer) entries.push(cleanEducationEntry(buffer));
        buffer = line;
      } else if (buffer && (hasYear || hasGrade || hasInstitution)) {
        buffer += ' | ' + line;
      } else if (buffer && line.length < 100) {
        buffer += ' ' + line;
      } else {
        if (buffer) entries.push(cleanEducationEntry(buffer));
        buffer = hasDegree || hasInstitution ? line : '';
      }
    }
    if (buffer) entries.push(cleanEducationEntry(buffer));

    return entries.filter(e => e.length > 8);
  };

  const sourceLines = educationLines.length > 1
    ? educationLines
    : text.split('\n').map(l => l.trim()).filter(l => {
        const lower = l.toLowerCase();
        return degreeKeywords.some(d => lower.includes(d)) && l.length > 5;
      });

  return mergeConsecutive(sourceLines).slice(0, 6);
};

// ─────────────────────────────────────────────
// 8. EXPERIENCE
// FIX: capture ALL role lines (not only lines with full date-ranges)
//      and handle "Positions of Responsibility" section heading
// ─────────────────────────────────────────────
const extractExperience = (text) => {
  const sections = splitIntoSections(text);

  const expLines = [
    ...(sections['experience'] || []),   // includes "Positions of Responsibility"
    ...(sections['volunteer'] || []),
    ...(sections['activities'] || []),
    ...(sections['extracurricular'] || []),
  ];

  const rolePattern = /\b(founder|co-founder|president|vice.?president|lead|head|manager|director|engineer|developer|intern|officer|secretary|coordinator|commander|chief|pathfinder|representative|researcher|assistant|mentor|ambassador)\b/i;

  // Month + year  OR  year range
  const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b.{0,20}(19|20)\d{2}/i;
  const yearRangePattern = /\b(19|20)\d{2}\s*(–|-|to)\s*(present|(19|20)\d{2})/i;

  const educationKeywords = [
    'b.tech', 'b.e', 'b.sc', 'm.tech', 'secondary', 'matriculation',
    'cbse', 'cgpa', 'sgpa', 'semester', 'percentage', 'board',
  ];

  const clean = (line) =>
    line
      .replace(/^[\s–\-•·▪◦▸►◆]+/, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const buildEntries = (lines) => {
    const results = [];
    const seen = new Set();
    let i = 0;

    while (i < lines.length) {
      const line = clean(lines[i]);
      if (!line || line.length < 8) { i++; continue; }

      const lower = line.toLowerCase();
      const hasRole = rolePattern.test(line);
      const hasDate = datePattern.test(line) || yearRangePattern.test(line);
      const isEdu = educationKeywords.some(k => lower.includes(k));

      if ((hasRole || hasDate) && !isEdu) {
        let entry = line;

        // Merge next line if it's a short date continuation
        if (
          i + 1 < lines.length &&
          lines[i + 1] &&
          (datePattern.test(lines[i + 1]) || yearRangePattern.test(lines[i + 1])) &&
          lines[i + 1].trim().length < 80
        ) {
          entry += ' | ' + clean(lines[i + 1]);
          i++;
        }

        if (!seen.has(entry)) {
          seen.add(entry);
          results.push(entry);
        }
      }

      i++;
      if (results.length >= 12) break;
    }

    return results;
  };

  const sourceLines = expLines.length > 1
    ? expLines
    : text.split('\n').map(l => l.trim()).filter(Boolean);

  return buildEntries(sourceLines);
};

// ─────────────────────────────────────────────
// 9. SUMMARY
// FIX: filter out institution/address/LinkedIn noise lines
// ─────────────────────────────────────────────
const extractSummary = (text) => {
  const sections = splitIntoSections(text);
  const candidates = [
    ...(sections['summary'] || []),
    ...(sections['objective'] || []),
    ...(sections['profile'] || []),
  ];

  const noisePatterns = [
    /linkedin/i, /github\.com/i, /http/i,
    /national institute/i, /university/i, /institute of technology/i,
    /jalandhar/i, /punjab/i, /ludhiana/i,
    /^\+?91/, /^\d{10}/,
  ];

  const cleaned = candidates
    .filter(l => l.length > 20)
    .filter(l => !noisePatterns.some(p => p.test(l)));

  if (cleaned.length > 0) {
    return cleaned.join(' ').replace(/\s{2,}/g, ' ').trim().slice(0, 600);
  }

  // Fallback: look in header for a descriptive sentence
  const headerLines = sections['header'] || [];
  const sentence = headerLines.find(l =>
    l.split(' ').length > 8 &&
    l.length < 500 &&
    !l.includes('@') &&
    !noisePatterns.some(p => p.test(l))
  );

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