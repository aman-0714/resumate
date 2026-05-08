console.log("🔥 PARSER v14 – section filter, exp validation, bullet filter, edu cleanup, LLM threshold 80");
// utils/resumeParser.js
//
// Pipeline:
//   1. PDF text extraction  (pdf-parse)
//   2. OCR fallback         (tesseract.js)    ← if text < MIN_TEXT_LENGTH
//   3. Text normalisation   (un-smash columns, clean)
//   4. Rule-based parsing   (regex + section splitter)
//   5. Confidence scoring   (field-level, 0-100)
//   6. LLM enrichment       (Claude)          ← ONLY when score < threshold

const pdfParse = require('pdf-parse');
const fs       = require('fs');

let Tesseract = null;
try { Tesseract = require('tesseract.js'); } catch { /* optional */ }

let Anthropic = null;
try { Anthropic = require('@anthropic-ai/sdk'); } catch { /* optional */ }

// ─────────────────────────────────────────────────────────────────────────────
// 1.  TEXT EXTRACTION + OCR
// ─────────────────────────────────────────────────────────────────────────────

const MIN_TEXT_LENGTH = 150;

const extractTextFromPDF = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err) {
    console.error('[Parser] pdf-parse error:', err.message);
    throw new Error('Failed to extract text from PDF.');
  }
};

const ocrFallback = async (filePath) => {
  if (!Tesseract) {
    console.warn('[Parser] tesseract.js not installed — skipping OCR. npm i tesseract.js');
    return '';
  }
  try {
    console.log('[Parser] Running OCR on image-based PDF…');
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
    console.log(`[Parser] OCR → ${text.length} chars`);
    return text || '';
  } catch (err) {
    console.error('[Parser] OCR error:', err.message);
    return '';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2.  TEXT NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

const unsmashColumns = (text) =>
  text
    .replace(/([^\s])(Dr\.|Mr\.|Mrs\.|Prof\.|Sr\.)/g, '$1 $2')
    .replace(/([^\s])\b(Senior Secondary|Matriculation|Higher Secondary|B\.Tech|M\.Tech|B\.Sc|M\.Sc)\b/g, '$1 $2')
    .replace(/([a-z])([A-Z](?![a-z]{0,2}\.))/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/[^\S\n]+/g, ' ');

const cleanText = (raw) =>
  unsmashColumns(raw)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\w\s.,;:!?@#&()\-_+=/'"%\n]/g, '')
    .split('\n').map(l => l.trim()).join('\n')
    .trim();

// ─────────────────────────────────────────────────────────────────────────────
// 3.  SECTION SPLITTER
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_HEADINGS = [
  'experience', 'work experience', 'professional experience', 'employment',
  'position of responsibility', 'positions of responsibility',
  'education', 'academic background', 'qualifications',
  'skills', 'technical skills', 'core competencies', 'soft skills',
  'projects', 'personal projects', 'academic projects',
  'certifications', 'certificates', 'courses',
  'summary', 'objective', 'profile', 'about me',
  'achievements', 'awards', 'honors',
  'languages', 'interests', 'hobbies',
  'volunteer', 'extracurricular', 'activities',
  'training', 'publications', 'references',
];

const splitIntoSections = (text) => {
  const sections = { header: [] };
  let current    = 'header';

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower   = trimmed.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const matched = SECTION_HEADINGS.find(h => lower === h || lower === h + 's');

    if (matched && trimmed.length < 70 && !/[,;]$/.test(trimmed)) {
      current = (
        matched === 'position of responsibility' ||
        matched === 'positions of responsibility'
      ) ? 'experience' : matched.split(' ')[0];
      if (!sections[current]) sections[current] = [];
    } else {
      if (!sections[current]) sections[current] = [];
      sections[current].push(trimmed);
    }
  }
  return sections;
};

// ─────────────────────────────────────────────────────────────────────────────
// 4.  FIELD EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────

// ── Name ──────────────────────────────────────────────────────────────────────
const extractName = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.includes('@') || /^https?:\/\//i.test(line) || line.length > 80) continue;
    const cleaned = line
      .replace(/[\|•·]\s*(\+?91[\s\-]?)?\d[\d\s\-().]{8,}/g, '')
      .replace(/\+91[\s\-]?\d{10}/g, '')
      .replace(/\b\d{10}\b/g, '')
      .replace(/\s{2,}/g, ' ').trim();
    if (cleaned.length >= 2 && cleaned.length <= 60 && /^[A-Za-z\s.\-']+$/.test(cleaned) && cleaned.includes(' '))
      return cleaned;
  }
  for (const line of lines.slice(0, 5)) {
    const c = line.replace(/(\+?91[\s\-]?)?\d+/g, '').trim();
    if (c.length > 2 && c.length < 60 && /[A-Za-z\s]/.test(c)) return c;
  }
  return '';
};

// ── Email ─────────────────────────────────────────────────────────────────────
const extractEmail = (text) => {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return '';
  const label = /^(Email|Mail|Contact|Phone|Address|Engineering|Education|Name|LinkedIn|Github|Website)+/i;
  return matches
    .map(m => { const [l, d] = m.split('@'); const s = l.replace(label, ''); return s.length ? `${s}@${d}` : m; })
    .sort((a, b) => a.length - b.length)[0];
};

// ── Phone ─────────────────────────────────────────────────────────────────────
const extractPhone = (text) => {
  const ind = text.match(/(\+91|91)?[\s\-]?[6-9]\d{9}/g);
  if (ind) return ind[0].replace(/[\s\-+]/g, '').replace(/^91/, '');
  const us = text.match(/(\+?1[\s.\-]?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g);
  return us ? us[0].trim() : '';
};

// ── Skills ────────────────────────────────────────────────────────────────────
const SKILL_LIST = [
  'javascript','python','java','c++','c#','ruby','php','swift','kotlin',
  'typescript','go','rust','scala','r','matlab','perl','shell','bash',
  'react','angular','vue','node.js','express','django','flask','spring',
  'laravel','rails','next.js','nuxt','fastapi','nestjs',
  'mongodb','mysql','postgresql','redis','sqlite','cassandra','oracle',
  'firebase','dynamodb','elasticsearch',
  'aws','azure','gcp','docker','kubernetes','jenkins','git','github',
  'gitlab','ci/cd','terraform','ansible','linux','nginx',
  'machine learning','deep learning','tensorflow','pytorch','pandas',
  'numpy','scikit-learn','keras','nlp','computer vision','data analysis',
  'rest api','graphql','microservices','agile','scrum','jira','html',
  'css','sass','tailwind','bootstrap','figma','photoshop',
  'leadership','communication','teamwork','problem solving','project management',
  'time management','critical thinking','adaptability','creativity',
];

const extractSkills = (text) => {
  const lower = text.toLowerCase();
  return [...new Set(SKILL_LIST.filter(s => lower.includes(s)))];
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.  EDUCATION  (v14 — cleaner degree/cgpa/year split, dedup)
// ─────────────────────────────────────────────────────────────────────────────

const DEGREE_KEYWORDS = [
  'b.tech','b.e.','b.e ','b.sc','m.tech','m.sc','mba','phd','ph.d',
  'bachelor','master','associate','diploma',
  'senior secondary','matriculation','higher secondary','12th','10th',
];
const INSTITUTION_PATTERN = /university|institute|school|college|\bnit\b|\biit\b|\biim\b/i;

const isTableHeader = (line) => {
  const lower = line.toLowerCase();
  return ['degree','institute','board','university','cgpa','percentage','year','qualification']
    .filter(w => lower.includes(w)).length >= 2;
};

// v14: Cleaner parseEducationEntry — extracts degree, institution, score, year
// robustly and removes duplicate/noise fragments.
const parseEducationEntry = (raw) => {
  // ── Degree ──────────────────────────────────────────────────────────────────
  let degree = '';
  const degreeMatch = raw.match(
    /\b(B\.Tech(?:\s+in\s+[\w\s]+)?|B\.E\.?(?:\s+in\s+[\w\s]+)?|B\.Sc\.?|M\.Tech(?:\s+in\s+[\w\s]+)?|M\.Sc\.?|MBA|Ph\.?D|Bachelor(?:\s+of\s+[\w\s]+)?|Master[s]?(?:\s+of\s+[\w\s]+)?|Associate|Diploma|Senior Secondary|Matriculation|Higher Secondary|10th|12th)\b/i
  );
  if (degreeMatch) {
    degree = degreeMatch[0].trim();
    // v14: strip trailing branch codes and junk
    degree = degree
      .replace(/\s+[A-Z]{2,5}(\s+and\s+minor\s+[A-Z]{2,5})?$/i, '')
      .replace(/[\d.\/\-%:\s]+$/, '')
      .trim();
  }

  // ── Institution ──────────────────────────────────────────────────────────────
  let institution = '';
  const instMatch = raw.match(
    /((?:Dr\.|Prof\.|Sri\s)?[A-Z][A-Za-z\s.\-()&']*(?:University|Institute|School|College|Vidyamandir|\bNIT\b|\bIIT\b|\bIIM\b)(?:[A-Za-z\s.\-()&,]{0,60})?)/
  );
  if (instMatch) {
    institution = instMatch[0]
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\d.%\s,]+/, '')
      .trim();
  }

  // ── Board ─────────────────────────────────────────────────────────────────────
  let board = '';
  const bm = raw.match(/\b(CBSE|ICSE|IGCSE|IB|State Board|BSEB|GSEB|RBSE|MSBSHSE)\b/i);
  if (bm) board = bm[0].toUpperCase();

  // ── Score (v14: prefer percentage, fall back to CGPA) ───────────────────────
  let score = '';
  const pct = raw.match(/(\d{2,3}(?:\.\d+)?)\s*%/);
  if (pct) {
    score = pct[1] + '%';
  } else {
    // v14: explicit CGPA label first, then bare X.XX pattern
    const cgpaLabeled = raw.match(/(?:cgpa|gpa)[:\s]*([0-9]\.[0-9]{1,2})/i);
    const cgpaBare    = raw.match(/\b([0-9]\.[0-9]{2})\b/);
    const cgpaMatch   = cgpaLabeled || cgpaBare;
    if (cgpaMatch) score = cgpaMatch[1] + ' CGPA';
  }

  // ── Year (v14: take last 4-digit year in range) ───────────────────────────
  let year = '';
  const explicit = [...raw.matchAll(/\b(20[12]\d|199\d)\b/g)];
  if (explicit.length) {
    year = explicit[explicit.length - 1][0];
  } else {
    const numDate = [...raw.matchAll(/\d{1,2}\/(20[12]\d|199\d)/g)];
    if (numDate.length) year = numDate[numDate.length - 1][1];
  }

  return {
    degree:      degree      || '',
    institution: institution || '',
    board:       board       || '',
    score:       score       || '',
    year:        year        || '',
    raw,
  };
};

const DEGREE_START_RE = /^\s*(B\.Tech|B\.E\.?|B\.Sc\.?|M\.Tech|M\.Sc\.?|MBA|Ph\.?D|Bachelor|Master[s]?|Associate|Diploma|Senior Secondary|Matriculation|Higher Secondary|10th|12th)\b/i;
const DEGREE_SPLIT_RE = /(?=\b(?:B\.Tech|B\.E\.?|B\.Sc\.?|M\.Tech|M\.Sc\.?|MBA|Ph\.?D|Bachelor|Master[s]?|Associate|Diploma|Senior\s+Secondary|Matriculation|Higher\s+Secondary|10th|12th)\b)/gi;

const extractEducation = (text) => {
  const sections = splitIntoSections(text);
  let eduLines   = sections['education'] || [];

  if (eduLines.length <= 1) {
    eduLines = text.split('\n').map(l => l.trim()).filter(l => {
      const lower = l.toLowerCase();
      return (DEGREE_KEYWORDS.some(d => lower.includes(d)) || INSTITUTION_PATTERN.test(l)) && l.length > 5;
    });
  }

  const rawBlobs = [];
  let buf = '';

  for (const line of eduLines) {
    const trimmed = line.trim();
    if (!trimmed || isTableHeader(trimmed)) continue;

    if (DEGREE_START_RE.test(trimmed)) {
      if (buf.trim().length > 5) rawBlobs.push(buf.trim());
      buf = trimmed;
    } else {
      if (buf) {
        buf += ' ' + trimmed;
      } else {
        if (INSTITUTION_PATTERN.test(trimmed)) buf = trimmed;
      }
    }
  }
  if (buf.trim().length > 5) rawBlobs.push(buf.trim());

  const rawEntries = [];
  for (const blob of rawBlobs) {
    DEGREE_SPLIT_RE.lastIndex = 0;
    const parts = blob.split(DEGREE_SPLIT_RE).map(p => p.trim()).filter(p => p.length > 5);
    rawEntries.push(...(parts.length > 1 ? parts : [blob]));
  }

  const merged = [];
  for (const entry of rawEntries) {
    const parsed = parseEducationEntry(entry);
    if (!parsed.degree && !parsed.institution && (parsed.score || parsed.year) && merged.length > 0) {
      merged[merged.length - 1] = merged[merged.length - 1] + ' ' + entry;
    } else {
      merged.push(entry);
    }
  }

  // v14: dedup — remove entries that are strict subsets of another entry's raw
  const results = merged.map(parseEducationEntry).slice(0, 6);
  return results.filter((entry, i) =>
    !results.some((other, j) =>
      i !== j &&
      other.raw.length > entry.raw.length &&
      other.raw.includes(entry.raw.slice(0, 30))
    )
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6.  EXPERIENCE  (v14 upgrades)
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_KEYWORDS = [
  'founder','co-founder','president','vice president','vp',
  'lead','head','manager','director','engineer','developer',
  'intern','officer','secretary','coordinator','commander',
  'chief','pathfinder','representative','researcher','assistant',
  'mentor','ambassador','maintenance','cultural','sponsorship',
  'pr team',
];

const ROLE_PATTERN = new RegExp(
  `\\b(${ROLE_KEYWORDS.join('|').replace(/[-\.]/g, '\\$&')})\\b`, 'i'
);

// v14: lines from skills/soft-skills sections are skipped before exp parsing
const SKILLS_SECTION_RE = /^(skills|soft skills|technical skills|core competencies)/i;

const DESC_START_RE = /^(led|managed|handled|coordinated|organized|achieved|built|developed|launched|oversaw|responsible|worked|hands-on|supervised|assisted|contributed|designed|implemented|conducted|performed|executed|prepared|analyzed|supported|trained|monitored)\b/i;

const MONTH_RE = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';

const DATE_MONTH_YEAR = new RegExp(`\\b(${MONTH_RE})\\b.{0,15}(19|20)\\d{2}`, 'i');
const YEAR_RANGE      = /\b(19|20)\d{2}\s*(–|-|to)\s*(present|(19|20)\d{2})/i;
const NUMERIC_RANGE   = /\d{1,2}\/(19|20)\d{2}\s*[–\-]\s*(?:\d{1,2}\/(19|20)\d{2}|present)/i;
const FULL_DATE_RANGE = new RegExp(
  `(${MONTH_RE})\\s+\\d{4}\\s*(?:–|-|to)\\s*(?:present|\\d{4}|(?:${MONTH_RE})\\s+\\d{4})`, 'i'
);

const EDU_NOISE = [
  'b.tech','b.e','b.sc','m.tech','secondary','matriculation',
  'cbse','cgpa','sgpa','semester','percentage','board','bachelor','master',
];

const hasAnyDate = (line) =>
  DATE_MONTH_YEAR.test(line) || YEAR_RANGE.test(line) || NUMERIC_RANGE.test(line);

const extractDateRange = (line) => {
  const m1 = line.match(FULL_DATE_RANGE);   if (m1) return m1[0].trim();
  const m2 = line.match(YEAR_RANGE);        if (m2) return m2[0].trim();
  const m3 = line.match(NUMERIC_RANGE);     if (m3) return m3[0].trim();
  const m4 = line.match(new RegExp(`(${MONTH_RE})\\s+\\d{4}`, 'i'));
  if (m4) return m4[0].trim();
  return '';
};

const stripDateFromLine = (line, period) => {
  if (!period) return line;
  return line.replace(period, '').replace(/\s{2,}/g, ' ').trim();
};

const cleanRole = (s) =>
  s.replace(/^[\s–\-•·▪◦▸►◆]+/, '')
   .replace(/\s{2,}/g, ' ')
   .trim();

// ── v14: Experience validation — only accept known title patterns ─────────────
// A line is "valid" for experience if it contains an intern/head/lead/year signal.
const EXP_VALID_RE = /\b(intern|head|lead|officer|director|founder|president|coordinator|ambassador|secretary|engineer|developer|researcher|mentor|manager)\b|\b20\d{2}\b/i;

const stripParens = (text) =>
  text.replace(/\s*\(([^)]*)\)/g, (match, inner) => {
    const trimmed = inner.trim();
    if (/^[A-Z]{1,6}$/.test(trimmed)) return ` (${trimmed})`;
    return '';
  }).replace(/\s{2,}/g, ' ').trim();

const stripTrailingJunk = (s) =>
  s
    .replace(/\s*(–|-|to)?\s*\b(present|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b.*$/i, '')
    .replace(/\s*(–|-|to)?\s*\b(19|20)\d{2}\b\s*$/i, '')
    .replace(/\s+\b(and|or|&)\s*$/i, '')
    .replace(/[,;:\-]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const ROLE_KW_LIST = [
  'pr team lead','vice president','co-founder',
  'production and direction head','direction head','production head',
  'founder','president','lead','head','manager','director',
  'engineer','developer','intern','officer','secretary',
  'coordinator','commander','chief','pathfinder',
  'representative','researcher','assistant','mentor','ambassador',
  'maintenance','cultural','sponsorship',
];

const findRoleEnd = (text) => {
  const lower = text.toLowerCase();
  let lastEnd = -1;
  for (const kw of ROLE_KW_LIST) {
    const idx = lower.lastIndexOf(kw);
    if (idx !== -1) {
      const end = idx + kw.length;
      if (end > lastEnd) lastEnd = end;
    }
  }
  return lastEnd;
};

const splitRoleOrg = (rawText) => {
  let text = stripParens(rawText);
  text = stripTrailingJunk(text);

  const at = text.match(/^(.+?)\s*@\s*(.+)$/);
  if (at) return { role: stripTrailingJunk(at[1].trim()), organization: stripTrailingJunk(at[2].trim()) };

  const pipe = text.match(/^(.+?)\s*\|\s*(.+)$/);
  if (pipe) return { role: stripTrailingJunk(pipe[1].trim()), organization: stripTrailingJunk(pipe[2].trim()) };

  const comma = text.match(/^(.+?),\s*(.+(?:nit|iit|club|society|team|company|corp|inc|ltd|pvt|org|dept|department|startup|school|college|institute|university).*)$/i);
  if (comma) return { role: stripTrailingJunk(comma[1].trim()), organization: stripTrailingJunk(comma[2].trim()) };

  const roleEnd = findRoleEnd(text);
  if (roleEnd > 0 && roleEnd < text.length) {
    const roleTitle = text.slice(0, roleEnd).trim();
    const orgPart   = text.slice(roleEnd).trim();
    if (orgPart.length > 0) {
      return { role: stripTrailingJunk(roleTitle), organization: stripTrailingJunk(orgPart) };
    }
    return { role: stripTrailingJunk(roleTitle), organization: '' };
  }

  const orgKwMatch = text.match(
    /^(.+?)\s+([A-Z][A-Za-z\-()&'\s]*(?:NITJ|IITB|NIT|IIT|IIM|Club|Society|Startup|Foundation|Pvt\.?|Ltd\.?|Corp\.?|Inc\.?)[A-Za-z\s\-()&'.]*)$/
  );
  if (orgKwMatch) return { role: stripTrailingJunk(orgKwMatch[1].trim()), organization: stripTrailingJunk(orgKwMatch[2].trim()) };

  return { role: stripTrailingJunk(text.trim()), organization: '' };
};

const isDescriptionLine = (line) => {
  const lower = line.toLowerCase();
  if (DESC_START_RE.test(lower) && line.length > 30) return true;
  if (/\b(circuit|analysis|control systems|equipment|operations|supervision|section)\b/i.test(line)) return true;
  return false;
};

// ── v14: clean org — remove month names that leak into org field ─────────────
const MONTH_NAMES_RE = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi;
const cleanOrg = (org) =>
  org
    .replace(MONTH_NAMES_RE, '')
    .replace(/\b20\d{2}\b/g, '')
    .replace(/[,;\-–]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const extractExperience = (text) => {
  const sections = splitIntoSections(text);
  const expLines = [
    ...(sections['experience']      || []),
    ...(sections['volunteer']       || []),
    ...(sections['activities']      || []),
    ...(sections['extracurricular'] || []),
  ];

  const build = (lines) => {
    const results = []; const seen = new Set(); let i = 0;

    while (i < lines.length) {
      const raw  = lines[i];
      const line = cleanRole(raw);
      if (!line || line.length < 5) { i++; continue; }

      const lower   = line.toLowerCase();
      const hasRole = ROLE_PATTERN.test(line);
      const hasDate = hasAnyDate(line);
      const isEdu   = EDU_NOISE.some(k => lower.includes(k));

      // v14 FIX 1: skip lines from skills/soft-skills sections
      if (SKILLS_SECTION_RE.test(line)) { i++; continue; }

      // v14 FIX 3: skip long bullet-style description lines (> 120 chars)
      if (line.length > 120) { i++; continue; }

      // Hard skip: description lines
      if (isDescriptionLine(line)) { i++; continue; }

      // Skip pure description lines
      const isPureDesc = !hasRole && !hasDate && DESC_START_RE.test(lower);
      if (isPureDesc) { i++; continue; }

      // v14 FIX 2: experience validation — only accept known title/year patterns
      if (!EXP_VALID_RE.test(line)) { i++; continue; }

      if ((hasRole || hasDate) && !isEdu) {
        let period    = extractDateRange(line);
        let titleText = stripDateFromLine(line, period);

        if (!period && i + 1 < lines.length) {
          const nextRaw = (lines[i + 1] || '').trim();
          if (hasAnyDate(nextRaw) && nextRaw.length < 80) {
            period = extractDateRange(nextRaw) || nextRaw;
            i++;
          }
        }

        const { role, organization } = splitRoleOrg(cleanRole(titleText));

        if (!role || role.length < 3) { i++; continue; }

        // Final guard: skip if the "role" is too long / looks like description
        if (role.split(' ').length > 6 && !/^[A-Z]/.test(role)) { i++; continue; }

        // v14: clean month names out of org field
        const cleanedOrg = cleanOrg(organization);

        const key = `${role}|${cleanedOrg}|${period}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ role, organization: cleanedOrg, period: period || '' });
        }
      }
      i++;
      if (results.length >= 15) break;
    }
    return results;
  };

  const source = expLines.length > 1
    ? expLines
    : text.split('\n').map(l => l.trim()).filter(Boolean);

  return build(source);
};

// ── Summary ───────────────────────────────────────────────────────────────────
const extractSummary = (text) => {
  const sections = splitIntoSections(text);
  const noise    = [
    /linkedin/i,/github\.com/i,/http/i,/national institute/i,
    /university/i,/institute of technology/i,
    /jalandhar/i,/punjab/i,/ludhiana/i,/khanna/i,
    /^\+?91/,/^\d{10}/,
  ];
  const cands = [
    ...(sections['summary']   || []),
    ...(sections['objective'] || []),
    ...(sections['profile']   || []),
  ].filter(l => l.length > 20 && !noise.some(p => p.test(l)));

  if (cands.length) return cands.join(' ').replace(/\s{2,}/g, ' ').trim().slice(0, 600);

  const hdr = (sections['header'] || []).find(
    l => l.split(' ').length > 8 && l.length < 500 && !l.includes('@') && !noise.some(p => p.test(l))
  );
  return hdr ? hdr.trim().slice(0, 600) : '';
};

// ── Section detector ──────────────────────────────────────────────────────────
const detectSections = (text) => {
  const all = ['experience','education','skills','projects','certifications','summary',
               'objective','publications','awards','languages','volunteer','interests',
               'references','achievements','training'];
  const low = text.toLowerCase();
  return all.filter(s => low.includes(s));
};

// ─────────────────────────────────────────────────────────────────────────────
// 7.  CONFIDENCE SCORER
// ─────────────────────────────────────────────────────────────────────────────

// v14: Raised LLM threshold from 60 → 80 for better accuracy
const CONFIDENCE_THRESHOLD = 80;

const scoreConfidence = (parsed) => {
  let score = 0;
  const bd  = {};

  const nameOk = parsed.name && parsed.name.trim().split(/\s+/).length >= 2 && !/\d/.test(parsed.name);
  bd.name  = nameOk ? 20 : 0; score += bd.name;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email || '');
  bd.email = emailOk ? 20 : 0; score += bd.email;

  const phoneOk = (parsed.phone || '').replace(/\D/g, '').length >= 8;
  bd.phone = phoneOk ? 10 : 0; score += bd.phone;

  bd.skills = (Array.isArray(parsed.skills) && parsed.skills.length >= 3) ? 5 : 0;
  score += bd.skills;

  const eduFull = Array.isArray(parsed.education) && parsed.education.some(e => e.degree && e.institution);
  const eduPart = Array.isArray(parsed.education) && parsed.education.length > 0;
  bd.education  = eduFull ? 25 : (eduPart ? 10 : 0);
  score += bd.education;

  bd.experience = (Array.isArray(parsed.experience) && parsed.experience.some(e => e.role && e.role.length > 3)) ? 15 : 0;
  score += bd.experience;

  bd.summary = (typeof parsed.summary === 'string' && parsed.summary.length > 20) ? 5 : 0;
  score += bd.summary;

  return { score, breakdown: bd, needsLLM: score < CONFIDENCE_THRESHOLD };
};

// ─────────────────────────────────────────────────────────────────────────────
// 8.  LLM ENRICHMENT  (v14: triggers at confidence < 80)
// ─────────────────────────────────────────────────────────────────────────────

const llmEnrich = async (rawText, regexParsed, breakdown) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.warn('[Parser] ANTHROPIC_API_KEY not set — skipping LLM.');
    return regexParsed;
  }
  if (!Anthropic) {
    console.warn('[Parser] @anthropic-ai/sdk not installed — npm i @anthropic-ai/sdk');
    return regexParsed;
  }

  const weakFields = Object.entries(breakdown).filter(([, v]) => v === 0).map(([k]) => k);
  console.log(`[Parser] Calling Claude — weak fields: ${weakFields.join(', ')}`);

  const client = new Anthropic({ apiKey });
  const prompt = `You are a precise resume parser. Fix only the WEAK fields: ${weakFields.join(', ')}.

CURRENT PARSE:
${JSON.stringify(regexParsed, null, 2)}

RESUME TEXT:
${rawText.slice(0, 6000)}

Rules:
- education: each entry must have its own degree, institution, score, year — do NOT collapse multiple degrees into one entry
- experience: role must contain ONLY the job title (e.g. "Vice President"), organization ONLY the org name (e.g. "SWRAC"), period ONLY the date range
- NEVER put descriptions, parenthetical content, bullet points, month names alone, or "Present" into role or organization fields
- Skip any line that is a description sentence (starts with action verbs like "Led", "Managed", "Hands-on", "Supervised")
- Skip any line longer than 120 characters
- Only include experience entries that contain a clear job title (Intern, Head, Lead, Engineer, etc.) or a year

Return ONLY valid JSON (no markdown):
{
  "name":"","email":"","phone":"","skills":[],
  "summary":"",
  "education":[{"degree":"","institution":"","board":"","score":"","year":"","raw":""}],
  "experience":[{"role":"","organization":"","period":""}],
  "sections":[]
}`;

  try {
    const msg  = await client.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    const txt  = msg.content.find(c => c.type === 'text')?.text || '';
    const data = JSON.parse(txt.replace(/```json|```/g, '').trim());
    return {
      name:       data.name       || regexParsed.name,
      email:      data.email      || regexParsed.email,
      phone:      data.phone      || regexParsed.phone,
      skills:     data.skills?.length     ? data.skills     : regexParsed.skills,
      summary:    data.summary    || regexParsed.summary,
      education:  data.education?.length  ? data.education  : regexParsed.education,
      experience: data.experience?.length ? data.experience : regexParsed.experience,
      sections:   data.sections?.length   ? data.sections   : regexParsed.sections,
    };
  } catch (err) {
    console.error('[Parser] LLM enrichment failed:', err.message);
    return regexParsed;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9.  MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

const parseResume = async (filePath, fileType) => {
  let rawText = '';
  let ocrUsed = false;

  if (fileType === 'pdf') {
    rawText = await extractTextFromPDF(filePath);
    if (rawText.trim().length < MIN_TEXT_LENGTH) {
      console.log(`[Parser] Sparse PDF (${rawText.trim().length} chars) — trying OCR…`);
      const ocr = await ocrFallback(filePath);
      if (ocr.length > rawText.length) { rawText = ocr; ocrUsed = true; }
    }
  } else {
    try { rawText = fs.readFileSync(filePath, 'utf8'); }
    catch { rawText = 'Unable to read file. Please upload a PDF.'; }
  }

  rawText = cleanText(rawText);

  const regexParsed = {
    name:       extractName(rawText),
    email:      extractEmail(rawText),
    phone:      extractPhone(rawText),
    skills:     extractSkills(rawText),
    education:  extractEducation(rawText),
    experience: extractExperience(rawText),
    summary:    extractSummary(rawText),
    sections:   detectSections(rawText),
  };

  const { score, breakdown, needsLLM } = scoreConfidence(regexParsed);
  console.log(`[Parser] Confidence ${score}/100`, breakdown);

  let parsedData = regexParsed;
  let llmUsed    = false;

  // v14: LLM triggers at < 80 (was 60) for higher overall quality
  if (needsLLM) {
    console.log(`[Parser] Score ${score} < 80 — invoking LLM enrichment…`);
    parsedData = await llmEnrich(rawText, regexParsed, breakdown);
    llmUsed    = true;
    const after = scoreConfidence(parsedData);
    console.log(`[Parser] Post-LLM confidence ${after.score}/100`);
  } else {
    console.log('[Parser] High confidence — LLM skipped ✓');
  }

  return {
    rawText,
    parsedData,
    meta: {
      confidenceScore:     score,
      confidenceBreakdown: breakdown,
      llmUsed,
      ocrUsed,
    },
  };
};

module.exports = { parseResume, extractSkills, detectSections };
