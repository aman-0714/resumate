// Aiscorer.js  —  v3.4
// v3.4 change:
//   • REPLACED Anthropic/Claude AI enrichment with FREE Hugging Face Inference API
//     Model: mistralai/Mistral-7B-Instruct-v0.2 (free tier, no credit card needed)
//     Set HF_API_KEY=hf_xxxxxxxx in your .env and Render env vars to enable AI enrichment

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// 1.  JOB ROLE KEYWORD DATABASE
// ─────────────────────────────────────────────────────────────────────────────

const JOB_ROLE_KEYWORDS = {
  'SOFTWARE-ENGINEERING': {
    required:  ['python', 'java', 'git', 'data structures', 'algorithms', 'api'],
    preferred: ['c++', 'go', 'react', 'node.js', 'sql', 'docker', 'system design', 'testing', 'agile', 'rest api'],
    title:     'Software Engineering',
  },
  'ELECTRICAL-ENGINEERING': {
    required:  ['electrical', 'circuit', 'matlab', 'power systems', 'control systems', 'simulation'],
    preferred: ['python', 'c++', 'embedded', 'plc', 'scada', 'machine learning', 'signal processing', 'microcontroller', 'git'],
    title:     'Electrical Engineering',
  },
  'DATA-SCIENCE': {
    required:  ['python', 'machine learning', 'data analysis', 'statistics', 'sql'],
    preferred: ['tensorflow', 'pytorch', 'pandas', 'numpy', 'r', 'scikit-learn', 'deep learning', 'nlp', 'visualization'],
    title:     'Data Science / ML',
  },
  'INFORMATION-TECHNOLOGY': {
    required:  ['javascript', 'python', 'java', 'sql', 'git', 'agile', 'api', 'linux'],
    preferred: ['react', 'node.js', 'aws', 'docker', 'kubernetes', 'microservices', 'ci/cd'],
    title:     'Information Technology',
  },
  'ENGINEERING': {
    required:  ['engineering', 'design', 'analysis', 'matlab', 'python', 'simulation'],
    preferred: ['c++', 'embedded systems', 'power systems', 'control systems', 'circuit', 'testing', 'machine learning', 'git', 'research'],
    title:     'Engineering',
  },
  'FINANCE': {
    required:  ['financial analysis', 'accounting', 'excel', 'budgeting', 'forecasting'],
    preferred: ['bloomberg', 'sql', 'python', 'tableau', 'cfa', 'risk management'],
    title:     'Finance',
  },
  'ACCOUNTANT': {
    required:  ['accounting', 'excel', 'quickbooks', 'tax', 'audit', 'financial statements'],
    preferred: ['cpa', 'gaap', 'erp', 'sap', 'budgeting', 'payroll'],
    title:     'Accounting',
  },
  'HR': {
    required:  ['recruitment', 'onboarding', 'hrms', 'payroll', 'employee relations'],
    preferred: ['workday', 'bamboohr', 'performance management', 'training', 'compliance'],
    title:     'Human Resources',
  },
  'HEALTHCARE': {
    required:  ['patient care', 'medical', 'clinical', 'ehr', 'hipaa', 'diagnosis'],
    preferred: ['nursing', 'medication', 'emr', 'cpr', 'bls', 'research'],
    title:     'Healthcare',
  },
  'DIGITAL-MEDIA': {
    required:  ['content creation', 'social media', 'photoshop', 'video editing', 'seo'],
    preferred: ['adobe', 'figma', 'analytics', 'wordpress', 'after effects', 'canva'],
    title:     'Digital Media',
  },
  'SALES': {
    required:  ['sales', 'crm', 'lead generation', 'negotiation', 'customer service'],
    preferred: ['salesforce', 'hubspot', 'b2b', 'b2c', 'kpi', 'revenue'],
    title:     'Sales',
  },
  'BANKING': {
    required:  ['banking', 'finance', 'compliance', 'kyc', 'aml', 'risk'],
    preferred: ['investment', 'portfolio', 'bloomberg', 'excel', 'regulatory', 'audit'],
    title:     'Banking',
  },
  'DESIGNER': {
    required:  ['figma', 'photoshop', 'ui/ux', 'design', 'wireframe', 'prototype'],
    preferred: ['sketch', 'illustrator', 'user research', 'adobe xd', 'css', 'html'],
    title:     'Design',
  },
  'TEACHER': {
    required:  ['teaching', 'curriculum', 'lesson planning', 'classroom management', 'assessment'],
    preferred: ['lms', 'online teaching', 'google classroom', 'differentiation', 'ib', 'cbse'],
    title:     'Teaching',
  },
  'CONSULTANT': {
    required:  ['consulting', 'strategy', 'analysis', 'project management', 'stakeholder'],
    preferred: ['powerpoint', 'excel', 'data analysis', 'problem solving', 'mba'],
    title:     'Consulting',
  },
  'BUSINESS-DEVELOPMENT': {
    required:  ['business development', 'sales', 'partnerships', 'strategy', 'market research'],
    preferred: ['crm', 'networking', 'negotiation', 'b2b', 'kpi', 'revenue growth'],
    title:     'Business Development',
  },
  'AVIATION': {
    required:  ['aviation', 'aircraft', 'faa', 'atpl', 'navigation', 'safety'],
    preferred: ['instrument rating', 'multi-engine', 'turbine', 'cpr', 'crew resource management'],
    title:     'Aviation',
  },
  'AGRICULTURE': {
    required:  ['agriculture', 'farming', 'crop', 'soil', 'irrigation', 'livestock'],
    preferred: ['precision agriculture', 'agronomy', 'pest management', 'gis', 'sustainability'],
    title:     'Agriculture',
  },
  'ARTS': {
    required:  ['creative', 'portfolio', 'design', 'illustration', 'art direction'],
    preferred: ['adobe creative suite', 'typography', 'branding', 'painting', 'sculpture'],
    title:     'Arts',
  },
  'AUTOMOBILE': {
    required:  ['automotive', 'mechanical', 'diagnostics', 'repair', 'engine'],
    preferred: ['obd', 'hybrid', 'electric vehicles', 'cad', 'quality control'],
    title:     'Automobile',
  },
  'BPO': {
    required:  ['customer service', 'call center', 'communication', 'crm', 'kpi'],
    preferred: ['technical support', 'data entry', 'quality assurance', 'escalation'],
    title:     'BPO/Customer Service',
  },
  'CHEF': {
    required:  ['cooking', 'culinary', 'food safety', 'menu planning', 'kitchen management'],
    preferred: ['servsafe', 'haccp', 'fine dining', 'pastry', 'catering'],
    title:     'Culinary / Chef',
  },
  'CONSTRUCTION': {
    required:  ['construction', 'project management', 'blueprint', 'safety', 'estimation'],
    preferred: ['autocad', 'bim', 'osha', 'concrete', 'site management', 'pmp'],
    title:     'Construction',
  },
  'FITNESS': {
    required:  ['fitness', 'personal training', 'exercise', 'nutrition', 'coaching'],
    preferred: ['certifications', 'group fitness', 'strength training', 'cpr', 'ace', 'nasm'],
    title:     'Fitness',
  },
  'PUBLIC-RELATIONS': {
    required:  ['public relations', 'media relations', 'press release', 'communication', 'brand'],
    preferred: ['crisis management', 'social media', 'writing', 'events', 'stakeholder'],
    title:     'Public Relations',
  },
  'APPAREL': {
    required:  ['fashion', 'apparel', 'textile', 'design', 'merchandising'],
    preferred: ['cad', 'trend analysis', 'supply chain', 'retail', 'pattern making'],
    title:     'Apparel / Fashion',
  },
  'ADVOCATE': {
    required:  ['legal', 'law', 'litigation', 'contracts', 'compliance', 'counsel'],
    preferred: ['research', 'drafting', 'court', 'negotiation', 'mediation', 'bar'],
    title:     'Legal / Advocate',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2.  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STRONG_ACTION_VERBS = [
  'developed','built','designed','implemented','launched','deployed','architected',
  'engineered','created','established','spearheaded','led','managed','directed',
  'coordinated','achieved','delivered','optimized','improved','increased','reduced',
  'streamlined','automated','migrated','integrated','collaborated','mentored',
  'researched','analyzed','presented','published','won','secured','organized','hosted',
  'trained','demonstrated','solved','executed','produced','supervised',
];

const WEAK_VERBS = [
  'worked','helped','assisted','did','made','tried','got',
  'was responsible','involved','contributed to',
];

const GENERIC_TECH_SKILLS = [
  'python','java','c++','javascript','go','r','matlab','html','css',
  'git','github','machine learning','data structures','algorithms',
  'sql','rest api','api','linux','docker','kubernetes','ci/cd',
  'system design','testing','agile','scrum','cloud computing',
  'microservices','typescript','version control','object oriented programming',
];

const SECTION_PATTERNS = {
  education:       /\b(education|academic|qualification|degree|university|college|b\.tech|bachelor)\b/i,
  experience:      /\b(experience|work history|employment|internship|position|responsibility)\b/i,
  skills:          /\b(skills|technologies|tools|competencies|languages|proficiencies)\b/i,
  projects:        /\b(projects?|portfolio|work samples?|academic project)\b/i,
  certifications:  /\b(certifications?|certificates?|courses?|training|workshop)\b/i,
  summary:         /\b(summary|objective|profile|about)\b/i,
  achievements:    /\b(achievements?|awards?|honors?|accomplishments?|distinction)\b/i,
};

// ─────────────────────────────────────────────────────────────────────────────
// 3.  JOB ROLE NORMALIZER
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_ALIASES = {
  'ELECTRICAL-ENGINEERING': [
    'electrical','electricalengineering','electricalengineer','ee',
    'elctrical','eletrical','electical','electricl',
    'electrical engineer','electrical engineering',
    'power engineering','power systems engineer',
    'electronics','electronics engineering','electronics engineer',
  ],
  'SOFTWARE-ENGINEERING': [
    'software','softwareengineering','softwareengineer','swe','sde',
    'software engineer','software engineering','software developer',
    'software development','backend','frontend','fullstack','full stack',
    'full-stack','web development','web developer',
  ],
  'DATA-SCIENCE': [
    'datascience','data science','data scientist','ds','ml','ai',
    'machine learning','machine learning engineer','mle',
    'data analyst','data analytics','data engineer',
    'artificial intelligence','deep learning',
  ],
  'INFORMATION-TECHNOLOGY': [
    'it','information technology','informationtechnology',
    'it engineer','it support','it specialist','systems engineer',
    'devops','cloud engineer','cloud','aws','azure',
  ],
  'ENGINEERING': [
    'engineer','engineering','mechanical','mechanical engineering',
    'mechanical engineer','civil','civil engineering','civil engineer',
    'chemical','chemical engineering','structural','systems engineering',
  ],
  'FINANCE': [
    'finance','financial','financial analyst','financial engineer',
    'investment','investment banking','investment analyst','fintech',
  ],
  'ACCOUNTANT': [
    'accountant','accounting','accounts','cpa','chartered accountant',
    'ca','financial accounting','bookkeeper','bookkeeping',
  ],
  'HR': [
    'hr','human resources','humanresources','people operations',
    'talent acquisition','recruiter','recruitment','hrbp',
    'hr manager','hr generalist',
  ],
  'HEALTHCARE': [
    'healthcare','health care','medical','doctor','physician','nurse',
    'nursing','clinical','hospital','pharmacist','pharmacy',
  ],
  'DIGITAL-MEDIA': [
    'digital media','digitalmedia','content creator','content creation',
    'social media','social media manager','seo','videographer',
    'video editor','youtuber','influencer',
  ],
  'SALES': [
    'sales','sales executive','sales manager','sales engineer',
    'business sales','account executive','ae','account manager',
  ],
  'BANKING': [
    'banking','bank','banker','investment banker','retail banking',
    'commercial banking','credit analyst','loan officer',
  ],
  'DESIGNER': [
    'designer','design','ui','ux','ui/ux','uiux','ui ux',
    'graphic designer','graphic design','product designer',
    'visual designer','ux designer','ui designer','web designer',
  ],
  'TEACHER': [
    'teacher','teaching','educator','faculty','professor','lecturer',
    'instructor','tutor','coach','trainer',
  ],
  'CONSULTANT': [
    'consultant','consulting','management consultant','strategy consultant',
    'business analyst','ba','advisory',
  ],
  'BUSINESS-DEVELOPMENT': [
    'business development','bizdev','biz dev','bd','partnerships',
    'growth','growth manager','growth hacker','strategy',
  ],
  'AVIATION': [
    'aviation','pilot','airline','aircraft','atpl','cpl','flying',
    'air traffic','flight operations',
  ],
  'AGRICULTURE': [
    'agriculture','farming','farmer','agronomy','agronomist',
    'crop science','horticulture','veterinary',
  ],
  'ARTS': [
    'arts','artist','creative','illustrator','animator','animation',
    'fine arts','photography','photographer',
  ],
  'AUTOMOBILE': [
    'automobile','automotive','car','vehicle','mechanic','auto',
    'ev','electric vehicle','automotive engineer',
  ],
  'BPO': [
    'bpo','call center','customer service','customer support',
    'customer care','helpdesk','help desk','service desk',
  ],
  'CHEF': [
    'chef','cook','culinary','baker','pastry','kitchen',
    'food','hospitality','catering',
  ],
  'CONSTRUCTION': [
    'construction','civil construction','site engineer','project manager',
    'contractor','architect','architecture','real estate',
  ],
  'FITNESS': [
    'fitness','personal trainer','gym','trainer','nutritionist',
    'sports','athlete','yoga','physiotherapist',
  ],
  'PUBLIC-RELATIONS': [
    'public relations','pr','communications','media relations',
    'corporate communications','brand manager','branding',
  ],
  'APPAREL': [
    'apparel','fashion','fashion designer','textile','merchandising',
    'clothing','retail fashion','garment',
  ],
  'ADVOCATE': [
    'advocate','lawyer','attorney','legal','law','solicitor',
    'barrister','counsel','paralegal','compliance officer',
  ],
};

const ALIAS_MAP = {};
for (const [canonicalKey, aliases] of Object.entries(ROLE_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_MAP[alias.toLowerCase().replace(/\s+/g, '')] = canonicalKey;
  }
}

const normalizeJobRole = (input) => {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (JOB_ROLE_KEYWORDS[trimmed.toUpperCase()]) return trimmed.toUpperCase();

  const slug = trimmed.toUpperCase().replace(/\s+/g, '-');
  if (JOB_ROLE_KEYWORDS[slug]) return slug;

  const collapsed = trimmed.toLowerCase().replace(/[\s\-_]+/g, '');
  if (ALIAS_MAP[collapsed]) return ALIAS_MAP[collapsed];

  const inputWords = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  let bestKey   = null;
  let bestScore = 0;

  for (const [canonicalKey, aliases] of Object.entries(ROLE_ALIASES)) {
    const aliasBlob = aliases.join(' ').toLowerCase();
    let score = 0;
    for (const word of inputWords) {
      if (word.length < 2) continue;
      if (aliasBlob.includes(word)) score += word.length;
    }
    if (score > bestScore) { bestScore = score; bestKey = canonicalKey; }
  }

  if (bestScore >= 4) {
    console.log(`[Scorer] Fuzzy role match: "${input}" → ${bestKey} (score ${bestScore})`);
    return bestKey;
  }

  console.warn(`[Scorer] Could not normalize jobRole: "${input}" — falling back to auto-detect`);
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 4.  AUTO ROLE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const autoDetectRole = (parsedData) => {
  if (!parsedData || !Array.isArray(parsedData.skills)) return null;
  const skills = parsedData.skills.map(s => s.toLowerCase());

  const roleSignals = {
    'ELECTRICAL-ENGINEERING': ['matlab', 'circuit', 'power systems', 'control systems', 'embedded', 'electrical'],
    'DATA-SCIENCE':           ['machine learning', 'tensorflow', 'pytorch', 'pandas', 'r', 'deep learning', 'numpy', 'python', 'data analysis'],
    'SOFTWARE-ENGINEERING':   ['react', 'node.js', 'spring', 'django', 'docker', 'kubernetes', 'microservices'],
    'INFORMATION-TECHNOLOGY': ['javascript', 'sql', 'linux', 'aws', 'agile', 'api'],
    'DESIGNER':               ['figma', 'photoshop', 'ui/ux', 'wireframe', 'sketch'],
    'ENGINEERING':            ['engineering', 'cad', 'autocad', 'solidworks'],
  };

  let bestRole  = null;
  let bestCount = 0;

  for (const [role, signals] of Object.entries(roleSignals)) {
    const count = signals.filter(sig => skills.some(s => s.includes(sig))).length;
    if (count > bestCount) { bestCount = count; bestRole = role; }
  }

  const hasEE  = skills.some(s => ['matlab','circuit','electrical','power'].includes(s));
  const hasWeb  = skills.some(s => ['react','javascript','node.js','angular'].includes(s));
  if (hasEE && !hasWeb && bestCount < 2) bestRole = 'ELECTRICAL-ENGINEERING';

  return bestCount > 0 ? bestRole : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.  SECTION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const detectSections = (text) => {
  const result = {};
  for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
    result[key] = pattern.test(text);
  }
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// 6.  KEYWORD ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

const analyzeKeywords = (text, jobRole, parsedData) => {
  const lower    = text.toLowerCase();
  const roleData = JOB_ROLE_KEYWORDS[jobRole];

  if (roleData) {
    const all     = [...roleData.required, ...roleData.preferred];
    const matched = all.filter(kw => lower.includes(kw));
    const missing = all.filter(kw => !lower.includes(kw)).slice(0, 10);

    const roleSet        = new Set(all);
    const relatedMatches = (parsedData?.skills || [])
      .filter(s => !roleSet.has(s.toLowerCase()) && lower.includes(s.toLowerCase()))
      .slice(0, 8);

    const reqMatched  = roleData.required.filter(kw => lower.includes(kw));
    const prefMatched = roleData.preferred.filter(kw => lower.includes(kw));
    const reqScore    = (reqMatched.length / roleData.required.length) * 60;
    const prefScore   = roleData.preferred.length > 0
      ? (prefMatched.length / roleData.preferred.length) * 40 : 40;
    const score = Math.round(reqScore + prefScore);

    return { matched, relatedMatches, missing, score, matchPercentage: score };
  }

  const matched = GENERIC_TECH_SKILLS.filter(s => lower.includes(s));
  const missing = GENERIC_TECH_SKILLS.filter(s => !lower.includes(s)).slice(0, 8);
  const score   = Math.min(100, Math.round((matched.length / GENERIC_TECH_SKILLS.length) * 100));

  const genericSet     = new Set(GENERIC_TECH_SKILLS);
  const relatedMatches = (parsedData?.skills || [])
    .filter(s => !genericSet.has(s.toLowerCase()))
    .slice(0, 6);

  return { matched, relatedMatches, missing, score, matchPercentage: score };
};

// ─────────────────────────────────────────────────────────────────────────────
// 7.  FORMATTING ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

const analyzeFormatting = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const classicBullet   = /^[\•\-\*▪►◆▸·–]\s+/;
  const numberedList    = /^\d+[\.\)]\s+/;
  const actionVerbStart = new RegExp(
    `^(${[
      'developed','built','designed','implemented','launched','deployed','led','managed',
      'coordinated','created','achieved','improved','increased','reduced','streamlined',
      'automated','integrated','collaborated','mentored','researched','analyzed','organized',
      'hosted','won','secured','trained','executed','produced','supervised','presented',
    ].join('|')})\\b`, 'i'
  );

  const bulletLines = lines.filter(l =>
    classicBullet.test(l) ||
    numberedList.test(l)  ||
    (actionVerbStart.test(l) && l.split(/\s+/).length <= 30)
  );

  const bulletPointsDetected = bulletLines.length > 0;
  const totalBulletPoints    = bulletLines.length;
  const bulletWordCounts     = bulletLines.map(l => l.split(/\s+/).length);
  const avgBulletLength      = totalBulletPoints > 0
    ? Math.round(bulletWordCounts.reduce((a, b) => a + b, 0) / totalBulletPoints)
    : 0;

  let readabilityScore = 5;
  if (bulletPointsDetected)                          readabilityScore += 1;
  if (totalBulletPoints >= 5)                        readabilityScore += 1;
  if (avgBulletLength >= 6 && avgBulletLength <= 25) readabilityScore += 1;
  if (lines.length > 20)                             readabilityScore += 1;
  if (text.split(/\s+/).length >= 200)               readabilityScore += 1;
  readabilityScore = Math.min(10, readabilityScore);

  return { bulletPointsDetected, totalBulletPoints, avgBulletLength, readabilityScore };
};

// ─────────────────────────────────────────────────────────────────────────────
// 8.  ACTION VERB ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

const analyzeActionVerbs = (text) => {
  const lower     = text.toLowerCase();
  const used      = STRONG_ACTION_VERBS.filter(v => lower.includes(v));
  const weakVerbs = WEAK_VERBS.filter(v => lower.includes(v));
  return { used, count: used.length, weakVerbs };
};

// ─────────────────────────────────────────────────────────────────────────────
// 9.  TEXT METRICS
// ─────────────────────────────────────────────────────────────────────────────

const analyzeMetrics = (text) => {
  const words     = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const wordCount           = words.length;
  const sentenceCount       = sentences.length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
  return { wordCount, sentenceCount, avgWordsPerSentence };
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. GRAMMAR / QUALITY CHECKS
// ─────────────────────────────────────────────────────────────────────────────

const analyzeGrammar = (text) => {
  const issues = [];
  let   score  = 10;

  if (/\b(I am|I have|I worked|my role|I led|I built)\b/i.test(text)) {
    issues.push('First-person pronouns detected (I, my). Use implied subject or third-person.');
    score -= 2;
  }
  if (/\b(synergy|guru|ninja|rockstar|wizard|dynamic team player|go-getter)\b/i.test(text)) {
    issues.push('Clichéd buzzwords detected. Replace with concrete descriptors.');
    score -= 1;
  }
  if (text.split(/\s+/).length < 150) {
    issues.push('Resume appears too short (< 150 words). Add more detail.');
    score -= 2;
  }

  const hasQuantifiable = (
    /\d+\s*%/i.test(text)
    || /\d+\s*(million|thousand|k\b)/i.test(text)
    || /\$\d+/i.test(text)
    || /\d{2,}\s*\+?\s*(students|events|members|users|teams|projects|people|participants)/i.test(text)
    || /cgpa[:\s]+[0-9]\.[0-9]/i.test(text)
    || /[0-9]{2,3}\.?[0-9]?\s*%/i.test(text)
    || /\b[0-9]+\s*(awards?|prizes?|positions?)/i.test(text)
  );
  if (!hasQuantifiable) {
    issues.push('No quantifiable achievements detected. Add numbers, percentages, or impact metrics (e.g., "Led team of 10", "Scored 91.4%").');
    score -= 2;
  }

  if (/(.)\1{3,}/.test(text)) {
    issues.push('Repeated characters detected — possible formatting artifact.');
    score -= 1;
  }

  return { score: Math.max(1, score), issues };
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. ATS COMPATIBILITY
// ─────────────────────────────────────────────────────────────────────────────

const analyzeATS = (text, sections, formatting, actionVerbs, metrics, keywordScore) => {
  const issues = [];

  const hasEmail = /\S+@\S+\.\S+/.test(text);
  const hasPhone = /\d{10}|\+\d{10,}/.test(text);
  if (!hasEmail) issues.push('Missing email address.');
  if (!hasPhone) issues.push('Missing phone number.');

  if (!sections.experience)     issues.push('No Experience section detected.');
  if (!sections.education)      issues.push('No Education section detected.');
  if (!sections.skills)         issues.push('No Skills section detected.');
  if (!sections.summary)        issues.push('No Summary/Objective section detected.');
  if (!sections.projects)       issues.push('No Projects section detected.');
  if (!sections.certifications) issues.push('No Certifications/Training section detected.');

  if (metrics.wordCount < 150)  issues.push('Resume too short — ATS may rank it low.');
  if (metrics.wordCount > 1200) issues.push('Resume too long — keep it under ~900 words.');

  if (!formatting.bulletPointsDetected)
    issues.push('No bullet points detected — use them for readability and ATS parsing.');

  if (actionVerbs.count < 3)
    issues.push('Too few strong action verbs — add at least 5.');
  if (actionVerbs.weakVerbs.length > 0)
    issues.push(`Weak verbs found: ${actionVerbs.weakVerbs.join(', ')}. Replace with stronger alternatives.`);

  if (keywordScore < 40)
    issues.push('Low keyword match — add more role-relevant keywords to your Skills and Experience sections.');

  const sectionKeys    = ['education','experience','skills','projects','summary'];
  const sectionPresent = sectionKeys.filter(k => sections[k]).length;
  const contactBonus   = (hasEmail ? 5 : 0) + (hasPhone ? 5 : 0);

  const atsScore = Math.min(100, Math.round(
    (keywordScore                                  * 0.50) +
    (sectionPresent / sectionKeys.length * 100     * 0.15) +
    (formatting.readabilityScore / 10 * 100        * 0.10) +
    (Math.min(actionVerbs.count, 10) / 10 * 100   * 0.15) +
    contactBonus
  ));

  const verdict = atsScore >= 70 ? 'Good' : atsScore >= 45 ? 'Moderate' : 'Poor';
  return { score: atsScore, verdict, issues };
};

// ─────────────────────────────────────────────────────────────────────────────
// 12. MISSING SKILLS
// ─────────────────────────────────────────────────────────────────────────────

const getMissingTechSkills = (text, jobRole) => {
  const lower    = text.toLowerCase();
  const roleData = JOB_ROLE_KEYWORDS[jobRole];
  if (roleData) {
    const all = [...roleData.required, ...roleData.preferred];
    return all.filter(s => !lower.includes(s));
  }
  return GENERIC_TECH_SKILLS.filter(s => !lower.includes(s));
};

// ─────────────────────────────────────────────────────────────────────────────
// 13. SUGGESTIONS GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

const generateSuggestions = (sections, formatting, actionVerbs, grammar, keywordResult, metrics, jobRole) => {
  const s = [];

  if (!sections.summary)
    s.push('Add a professional Summary/Objective section at the top (2–3 lines about your goals and key strengths).');
  if (!sections.projects)
    s.push('Add a Projects section — list at least 2 projects with tech stack used and measurable outcomes.');
  if (!sections.certifications)
    s.push('Add Certifications or Training — even online course completions from Coursera, NPTEL, or Udemy count.');
  if (keywordResult.missing.length > 0)
    s.push(`Add missing keywords into your Skills and Experience: ${keywordResult.missing.slice(0, 5).join(', ')}.`);
  if (!formatting.bulletPointsDetected)
    s.push('Use bullet points (start each with an action verb) for all experience and project entries.');
  if (formatting.avgBulletLength > 25)
    s.push('Shorten bullet points — ideal length is 10–20 words per bullet.');
  if (actionVerbs.count < 5)
    s.push(`Start each bullet with a strong action verb: Developed, Implemented, Designed, Optimized, Built.`);
  if (actionVerbs.weakVerbs.length > 0)
    s.push(`Replace weak verbs (${actionVerbs.weakVerbs.join(', ')}) with power verbs like Spearheaded, Executed, Delivered.`);
  if (grammar.issues.some(i => i.includes('quantifiable')))
    s.push('Quantify every achievement — "Organized event for 200+ students", "Achieved 91.4% in Class 12", "Reduced X by Y%".');
  if (metrics.wordCount < 250)
    s.push('Expand your resume — target 300–600 words. Add detail to each role and project.');
  if (grammar.issues.some(i => i.includes('first-person')))
    s.push('Remove first-person pronouns. Write "Built X" not "I built X".');

  return s;
};

// ─────────────────────────────────────────────────────────────────────────────
// 14. RULE-BASED STRENGTHS & WEAKNESSES
// ─────────────────────────────────────────────────────────────────────────────

const generateStrengthsWeaknesses = (sections, formatting, actionVerbs, grammar, keywords, metrics, effectiveRole) => {
  const strengths  = [];
  const weaknesses = [];

  if (keywords.matched.length >= 5) {
    const roleLabel = effectiveRole
      ? effectiveRole.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : 'the target role';
    strengths.push(
      `Strong keyword alignment — ${keywords.matched.length} role-relevant skills matched ` +
      `(${keywords.matched.slice(0, 4).join(', ')}…), signalling solid ATS compatibility for ${roleLabel}.`
    );
  } else if (keywords.matched.length >= 2) {
    strengths.push(
      `Partial keyword match — ${keywords.matched.length} relevant skills present (${keywords.matched.join(', ')}); ` +
      `adding more will improve ATS ranking.`
    );
  }

  if (actionVerbs.count >= 5) {
    strengths.push(
      `Effective use of ${actionVerbs.count} strong action verbs ` +
      `(e.g. ${actionVerbs.used.slice(0, 3).join(', ')}), giving bullet points an active, results-driven tone.`
    );
  } else if (actionVerbs.count >= 2) {
    strengths.push(
      `${actionVerbs.count} action verbs detected (${actionVerbs.used.slice(0, 2).join(', ')}); ` +
      `increasing to 5+ will strengthen impact.`
    );
  }

  if (sections.experience && sections.education && sections.skills) {
    strengths.push('Core resume sections (Experience, Education, Skills) are all present, ensuring proper ATS parsing.');
  } else if (sections.experience || sections.education) {
    const present = [sections.experience && 'Experience', sections.education && 'Education']
      .filter(Boolean).join(' & ');
    strengths.push(`${present} section detected — foundational resume structure is in place.`);
  }

  if (formatting.bulletPointsDetected && formatting.totalBulletPoints >= 4) {
    strengths.push(
      `Good use of bullet points (${formatting.totalBulletPoints} detected) — improves scannability ` +
      `for both ATS and human reviewers.`
    );
  }

  if (sections.projects)      strengths.push('Projects section present — demonstrates practical, hands-on application of skills beyond coursework.');
  if (sections.certifications) strengths.push('Certifications / Training section included — shows commitment to continuous learning.');

  if (metrics.wordCount >= 300 && metrics.wordCount <= 900) {
    strengths.push(`Resume length is optimal (${metrics.wordCount} words) — concise yet detailed enough for thorough ATS evaluation.`);
  }

  if (grammar.score >= 8) strengths.push('Clean, professional language with no major grammar or tone issues detected.');

  if (keywords.missing.length >= 5) {
    weaknesses.push(
      `${keywords.missing.length} important role keywords absent from the resume ` +
      `(e.g. ${keywords.missing.slice(0, 4).join(', ')}); ATS may filter it before human review.`
    );
  } else if (keywords.missing.length >= 2) {
    weaknesses.push(`${keywords.missing.length} role-relevant keywords missing (${keywords.missing.join(', ')}); adding them will improve match rate.`);
  }

  if (!sections.summary)        weaknesses.push('No professional Summary/Objective section — its absence lowers ATS score significantly.');
  if (!sections.projects)       weaknesses.push('No Projects section — critical evidence of practical skill for technical roles.');
  if (!sections.certifications)  weaknesses.push('No Certifications/Training — even short online courses add credibility and keyword density.');

  if (!formatting.bulletPointsDetected) {
    weaknesses.push('No bullet points detected — paragraph blocks are hard for ATS to parse; switch to bullet-point format.');
  } else if (formatting.avgBulletLength > 28) {
    weaknesses.push(`Bullet points too long on average (${formatting.avgBulletLength} words) — keep under 20 words.`);
  }

  if (actionVerbs.count < 3)
    weaknesses.push('Very few strong action verbs — resume reads passively; lead every bullet with Developed, Implemented, or Delivered.');
  if (actionVerbs.weakVerbs.length > 0)
    weaknesses.push(`Weak verbs detected (${actionVerbs.weakVerbs.join(', ')}) — replace with Spearheaded, Executed, or Optimized.`);
  if (grammar.issues.some(i => i.toLowerCase().includes('quantifiable')))
    weaknesses.push('No quantifiable achievements — add metrics like "Improved efficiency by 30%" or "Managed a team of 8".');

  if (metrics.wordCount < 200) {
    weaknesses.push(`Resume very short (${metrics.wordCount} words) — expand to 300–600 words.`);
  } else if (metrics.wordCount > 1000) {
    weaknesses.push(`Resume too long (${metrics.wordCount} words) — condense to under 900 words.`);
  }

  if (keywords.matchPercentage < 40) {
    weaknesses.push(`Low keyword match (${keywords.matchPercentage}%) — tailor the resume to each job description.`);
  }

  return {
    strengths:  strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 15. OVERALL SCORE
// ─────────────────────────────────────────────────────────────────────────────

const calcOverallScore = (ats, keyword, formatting, actionVerbs, grammar) =>
  Math.min(100, Math.round(
    ats                                          * 0.25 +
    keyword                                      * 0.25 +
    (formatting.readabilityScore / 10 * 100)     * 0.15 +
    (Math.min(actionVerbs.count, 10) / 10 * 100) * 0.15 +
    (grammar.score / 10 * 100)                   * 0.20
  ));

// ─────────────────────────────────────────────────────────────────────────────
// 16. HUGGING FACE AI ENRICHMENT  ← FREE, replaces Claude/Anthropic
//
//  Model : mistralai/Mistral-7B-Instruct-v0.2
//  Tier  : Free (no credit card needed, ~1000 req/day)
//
//  Setup (one-time):
//    1. Sign up free at https://huggingface.co
//    2. Settings → Access Tokens → New Token  (read access is enough)
//    3. Add  HF_API_KEY=hf_xxxxxxxxxxxx  to:
//         • your local .env file
//         • Render → your service → Environment variables
// ─────────────────────────────────────────────────────────────────────────────

const hfEnrich = async (resumeText, ruleResult, jobRole) => {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey || apiKey === 'your_hf_api_key_here') {
    console.warn('[Scorer] HF_API_KEY not set — skipping AI enrichment (rule-based results used).');
    return null;
  }

  const roleTitle = JOB_ROLE_KEYWORDS[jobRole]?.title || jobRole || 'a professional role';

  // Mistral instruct format
  const prompt = `<s>[INST] You are a strict ATS resume analyst. Analyse this resume for ${roleTitle}.

Rule-based scores:
- ATS Score: ${ruleResult.ats.score}/100
- Keyword Match: ${ruleResult.keywords.score}/100
- Grammar Score: ${ruleResult.grammar.score}/10
- Action Verbs Found: ${ruleResult.actionVerbs.count}

Resume text (first 2000 characters):
${resumeText.slice(0, 2000)}

Return ONLY a valid JSON object. No explanation, no markdown fences, no extra text:
{
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "weaknesses": ["specific weakness 1", "specific weakness 2", "specific weakness 3"],
  "topSuggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
  "detailedFeedback": "2-3 sentence honest overall assessment for ${roleTitle}",
  "grammarIssues": ["grammar issue if any"],
  "missingSections": ["missing section if any"]
} [/INST]</s>`;

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens:   600,
            temperature:      0.3,
            return_full_text: false,
            stop:             ['</s>'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 503) {
        // Normal on free tier — model cold-starts after inactivity (~20 sec)
        console.warn('[Scorer] HF model warming up (503) — skipping enrichment this request.');
      } else {
        console.error('[Scorer] HF API error:', response.status, errText);
      }
      return null;
    }

    const data = await response.json();
    const raw  = Array.isArray(data)
      ? (data[0]?.generated_text || '')
      : (data?.generated_text || '');

    // Pull the JSON block out of whatever the model returned
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Scorer] HF response contained no JSON — falling back to rule-based.');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[Scorer] ✅ HF AI enrichment successful');
    return parsed;

  } catch (err) {
    console.error('[Scorer] HF enrichment error:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 17. MAIN EXPORT — scoreResume
// ─────────────────────────────────────────────────────────────────────────────

const scoreResume = async (rawText, parsedData, jobRole) => {
  const normalizedRole = normalizeJobRole(jobRole);

  if (jobRole && !normalizedRole) {
    console.warn(`[Scorer] jobRole "${jobRole}" could not be normalized — falling back to auto-detect`);
  } else if (jobRole && normalizedRole && normalizedRole !== jobRole.trim().toUpperCase()) {
    console.log(`[Scorer] jobRole normalized: "${jobRole}" → "${normalizedRole}"`);
  }

  const effectiveRole = normalizedRole || autoDetectRole(parsedData) || null;
  if (!normalizedRole && effectiveRole) {
    console.log(`[Scorer] Auto-detected role: ${effectiveRole}`);
  }

  const sections      = detectSections(rawText);
  const keywords      = analyzeKeywords(rawText, effectiveRole, parsedData);
  const formatting    = analyzeFormatting(rawText);
  const actionVerbs   = analyzeActionVerbs(rawText);
  const metrics       = analyzeMetrics(rawText);
  const grammar       = analyzeGrammar(rawText);
  const ats           = analyzeATS(rawText, sections, formatting, actionVerbs, metrics, keywords.score);
  const missingSkills = getMissingTechSkills(rawText, effectiveRole);
  const suggestions   = generateSuggestions(sections, formatting, actionVerbs, grammar, keywords, metrics, effectiveRole);
  const overallScore  = calcOverallScore(ats.score, keywords.score, formatting, actionVerbs, grammar);

  // Always generate rule-based strengths & weaknesses as reliable fallback
  const ruleSwap   = generateStrengthsWeaknesses(sections, formatting, actionVerbs, grammar, keywords, metrics, effectiveRole);
  const ruleResult = { ats, keywords, formatting, actionVerbs, metrics, grammar };

  // HF AI enrichment — runs for all resumes, gracefully falls back if unavailable
  console.log(`[Scorer] Score ${overallScore} — requesting HF AI enrichment…`);
  const aiResult = await hfEnrich(rawText, ruleResult, effectiveRole);

  const summary = overallScore >= 75
    ? 'Strong resume with good ATS compatibility.'
    : overallScore >= 50
    ? 'Moderate resume — several targeted improvements will significantly boost your score.'
    : 'Resume needs improvement — focus on keywords, bullet points, and quantifiable achievements.';

  return {
    success:         true,
    score:           overallScore,
    summary:         aiResult?.detailedFeedback || summary,
    selectedJobRole: effectiveRole || '',
    detectedRole:    effectiveRole || 'Generic Tech',

    ats: {
      score:   ats.score,
      verdict: ats.verdict,
      issues:  ats.issues,
    },
    sections,
    keywords: {
      matched:         keywords.matched,
      relatedMatches:  keywords.relatedMatches,
      missing:         keywords.missing,
      matchPercentage: keywords.matchPercentage,
      score:           keywords.score,
    },
    formatting,
    actionVerbs,
    metrics,
    grammar: {
      score:  grammar.score,
      issues: [...grammar.issues, ...(aiResult?.grammarIssues || [])],
    },
    missingSkills,
    issues: [
      ...ats.issues,
      ...grammar.issues,
      ...(aiResult?.missingSections || []),
    ],
    suggestions: [
      ...suggestions,
      ...(aiResult?.topSuggestions || []),
    ],
    strengths:  (aiResult?.strengths?.length  ? aiResult.strengths  : ruleSwap.strengths),
    weaknesses: (aiResult?.weaknesses?.length ? aiResult.weaknesses : ruleSwap.weaknesses),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 18. CAREER GUIDANCE
// ─────────────────────────────────────────────────────────────────────────────

const CAREER_GUIDANCE = {
  'SOFTWARE-ENGINEERING': {
    courses: [
      { title: 'CS50x — Introduction to Computer Science', platform: 'Harvard/edX',  url: 'https://cs50.harvard.edu/x' },
      { title: 'System Design Primer',                     platform: 'GitHub',        url: 'https://github.com/donnemartin/system-design-primer' },
      { title: 'Full Stack Web Development',               platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org' },
    ],
    projects: ['Build a REST API with Node.js & MongoDB', 'Create a personal portfolio site', 'Contribute to an open-source project on GitHub'],
    skills:   ['System Design', 'SQL', 'Docker', 'TypeScript', 'REST API'],
    paths:    ['Software Engineer → Senior Engineer → Tech Lead → Engineering Manager'],
  },
  'ELECTRICAL-ENGINEERING': {
    courses: [
      { title: 'MATLAB Onramp',                      platform: 'MathWorks',     url: 'https://matlabacademy.mathworks.com' },
      { title: 'Embedded Systems — Shape The World', platform: 'edX/UT Austin', url: 'https://www.edx.org' },
      { title: 'Machine Learning for Engineers',     platform: 'Coursera',      url: 'https://www.coursera.org' },
    ],
    projects: ['Design a simple embedded system (Arduino/Raspberry Pi)', 'Simulate a power system in MATLAB/Simulink', 'Build a sensor data logger with Python'],
    skills:   ['Embedded C/C++', 'MATLAB/Simulink', 'PLC Programming', 'Signal Processing', 'Python for EE'],
    paths:    ['Electrical Engineer → Senior Engineer → Systems Architect → Engineering Manager'],
  },
  'DATA-SCIENCE': {
    courses: [
      { title: 'Machine Learning Specialization', platform: 'Coursera/DeepLearning.AI', url: 'https://www.coursera.org' },
      { title: 'Kaggle Learn',                    platform: 'Kaggle',                   url: 'https://www.kaggle.com/learn' },
      { title: 'Fast.ai Deep Learning',           platform: 'fast.ai',                  url: 'https://www.fast.ai' },
    ],
    projects: ['Kaggle competition submission', 'End-to-end ML pipeline with deployment', 'Data analysis report with visualizations'],
    skills:   ['SQL', 'TensorFlow / PyTorch', 'Data Visualization', 'Feature Engineering', 'Model Deployment'],
    paths:    ['Data Analyst → Data Scientist → Senior Data Scientist → ML Engineer → Research Scientist'],
  },
  'INFORMATION-TECHNOLOGY': {
    courses: [
      { title: 'Full Stack Web Development', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org' },
      { title: 'AWS Cloud Practitioner',     platform: 'AWS Training',  url: 'https://aws.amazon.com/training' },
      { title: 'System Design Primer',       platform: 'GitHub',        url: 'https://github.com/donnemartin/system-design-primer' },
    ],
    projects: ['Build a REST API', 'React dashboard with real-time data', 'Deploy a containerized app on AWS'],
    skills:   ['System Design', 'Cloud Computing', 'Docker & Kubernetes', 'TypeScript'],
    paths:    ['Software Engineer → Senior Engineer → Tech Lead → Engineering Manager'],
  },
  'FINANCE': {
    courses: [
      { title: 'Financial Modeling & Valuation', platform: 'CFI',      url: 'https://corporatefinanceinstitute.com' },
      { title: 'CFA Exam Prep',                  platform: 'Kaplan',   url: 'https://www.kaplan.com/cfa' },
      { title: 'Excel for Finance',              platform: 'Coursera', url: 'https://www.coursera.org' },
    ],
    projects: ['DCF valuation model', 'Portfolio tracker with Python', 'Personal finance dashboard'],
    skills:   ['Financial Modeling', 'Python for Finance', 'Bloomberg Terminal', 'CFA'],
    paths:    ['Analyst → Associate → VP → Director → MD'],
  },
  'DESIGNER': {
    courses: [
      { title: 'Google UX Design Certificate', platform: 'Coursera',      url: 'https://www.coursera.org' },
      { title: 'UI/UX Design Bootcamp',        platform: 'Udemy',         url: 'https://www.udemy.com' },
      { title: 'Advanced Figma',               platform: 'Figma Academy', url: 'https://www.figma.com' },
    ],
    projects: ['Redesign a popular app UI', 'Build a design system', 'End-to-end UX case study'],
    skills:   ['User Research', 'Motion Design', 'Accessibility (WCAG)', 'Design Systems'],
    paths:    ['Junior Designer → Senior Designer → Design Lead → Head of Design'],
  },
};

const getCareerGuidance = (jobRole, missingSkills) => {
  const guidance = CAREER_GUIDANCE[jobRole] || {
    courses: [
      { title: 'Professional Development', platform: 'Coursera', url: 'https://www.coursera.org' },
      { title: 'LinkedIn Learning Paths',  platform: 'LinkedIn', url: 'https://linkedin.com/learning' },
    ],
    projects: ['Build a portfolio project in your field', 'Contribute to open source', 'Write technical blog posts'],
    skills:   missingSkills.slice(0, 5),
    paths:    ['Entry Level → Mid Level → Senior Level → Lead/Manager'],
  };

  return {
    recommendedCourses:  guidance.courses,
    recommendedProjects: guidance.projects,
    skillsToLearn:       guidance.skills,
    careerPaths:         guidance.paths,
    generatedAt:         new Date(),
  };
};

module.exports = { scoreResume, getCareerGuidance, JOB_ROLE_KEYWORDS, normalizeJobRole };