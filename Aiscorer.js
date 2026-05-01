// utils/aiScorer.js
/**
 * AI Scoring Engine for Resume Analysis
 * Uses rule-based NLP + OpenAI API for deep analysis
 */

const axios = require('axios');

// ─── Job Role Keyword Database (built from your dataset categories) ────────────
const JOB_ROLE_KEYWORDS = {
  'INFORMATION-TECHNOLOGY': {
    required: ['javascript', 'python', 'java', 'sql', 'git', 'agile', 'api', 'linux'],
    preferred: ['react', 'node.js', 'aws', 'docker', 'kubernetes', 'microservices', 'ci/cd'],
    title: 'Information Technology',
  },
  'ENGINEERING': {
    required: ['engineering', 'design', 'analysis', 'project management', 'cad', 'matlab'],
    preferred: ['autocad', 'solidworks', 'python', 'simulation', 'testing', 'quality'],
    title: 'Engineering',
  },
  'FINANCE': {
    required: ['financial analysis', 'accounting', 'excel', 'budgeting', 'forecasting'],
    preferred: ['bloomberg', 'sql', 'python', 'tableau', 'cfa', 'risk management'],
    title: 'Finance',
  },
  'ACCOUNTANT': {
    required: ['accounting', 'excel', 'quickbooks', 'tax', 'audit', 'financial statements'],
    preferred: ['cpa', 'gaap', 'erp', 'sap', 'budgeting', 'payroll'],
    title: 'Accounting',
  },
  'HR': {
    required: ['recruitment', 'onboarding', 'hrms', 'payroll', 'employee relations'],
    preferred: ['workday', 'bamboohr', 'performance management', 'training', 'compliance'],
    title: 'Human Resources',
  },
  'HEALTHCARE': {
    required: ['patient care', 'medical', 'clinical', 'ehr', 'hipaa', 'diagnosis'],
    preferred: ['nursing', 'medication', 'emr', 'cpr', 'bls', 'research'],
    title: 'Healthcare',
  },
  'DIGITAL-MEDIA': {
    required: ['content creation', 'social media', 'photoshop', 'video editing', 'seo'],
    preferred: ['adobe', 'figma', 'analytics', 'wordpress', 'after effects', 'canva'],
    title: 'Digital Media',
  },
  'SALES': {
    required: ['sales', 'crm', 'lead generation', 'negotiation', 'customer service'],
    preferred: ['salesforce', 'hubspot', 'b2b', 'b2c', 'kpi', 'revenue'],
    title: 'Sales',
  },
  'BANKING': {
    required: ['banking', 'finance', 'compliance', 'kyc', 'aml', 'risk'],
    preferred: ['investment', 'portfolio', 'bloomberg', 'excel', 'regulatory', 'audit'],
    title: 'Banking',
  },
  'DESIGNER': {
    required: ['figma', 'photoshop', 'ui/ux', 'design', 'wireframe', 'prototype'],
    preferred: ['sketch', 'illustrator', 'user research', 'adobe xd', 'css', 'html'],
    title: 'Design',
  },
  'TEACHER': {
    required: ['teaching', 'curriculum', 'lesson planning', 'classroom management', 'assessment'],
    preferred: ['lms', 'online teaching', 'google classroom', 'differentiation', 'ib', 'cbse'],
    title: 'Teaching',
  },
  'CONSULTANT': {
    required: ['consulting', 'strategy', 'analysis', 'project management', 'stakeholder'],
    preferred: ['powerpoint', 'excel', 'data analysis', 'problem solving', 'mba'],
    title: 'Consulting',
  },
  'BUSINESS-DEVELOPMENT': {
    required: ['business development', 'sales', 'partnerships', 'strategy', 'market research'],
    preferred: ['crm', 'networking', 'negotiation', 'b2b', 'kpi', 'revenue growth'],
    title: 'Business Development',
  },
  'AVIATION': {
    required: ['aviation', 'aircraft', 'faa', 'atpl', 'navigation', 'safety'],
    preferred: ['instrument rating', 'multi-engine', 'turbine', 'cpr', 'crew resource management'],
    title: 'Aviation',
  },
  'AGRICULTURE': {
    required: ['agriculture', 'farming', 'crop', 'soil', 'irrigation', 'livestock'],
    preferred: ['precision agriculture', 'agronomy', 'pest management', 'gis', 'sustainability'],
    title: 'Agriculture',
  },
  'ARTS': {
    required: ['creative', 'portfolio', 'design', 'illustration', 'art direction'],
    preferred: ['adobe creative suite', 'typography', 'branding', 'painting', 'sculpture'],
    title: 'Arts',
  },
  'AUTOMOBILE': {
    required: ['automotive', 'mechanical', 'diagnostics', 'repair', 'engine'],
    preferred: ['obd', 'hybrid', 'electric vehicles', 'cad', 'quality control'],
    title: 'Automobile',
  },
  'BPO': {
    required: ['customer service', 'call center', 'communication', 'crm', 'kpi'],
    preferred: ['technical support', 'data entry', 'quality assurance', 'escalation'],
    title: 'BPO/Customer Service',
  },
  'CHEF': {
    required: ['cooking', 'culinary', 'food safety', 'menu planning', 'kitchen management'],
    preferred: ['servsafe', 'haccp', 'fine dining', 'pastry', 'catering'],
    title: 'Culinary / Chef',
  },
  'CONSTRUCTION': {
    required: ['construction', 'project management', 'blueprint', 'safety', 'estimation'],
    preferred: ['autocad', 'bim', 'osha', 'concrete', 'site management', 'pmp'],
    title: 'Construction',
  },
  'FITNESS': {
    required: ['fitness', 'personal training', 'exercise', 'nutrition', 'coaching'],
    preferred: ['certifications', 'group fitness', 'strength training', 'cpr', 'ace', 'nasm'],
    title: 'Fitness',
  },
  'PUBLIC-RELATIONS': {
    required: ['public relations', 'media relations', 'press release', 'communication', 'brand'],
    preferred: ['crisis management', 'social media', 'writing', 'events', 'stakeholder'],
    title: 'Public Relations',
  },
  'APPAREL': {
    required: ['fashion', 'apparel', 'textile', 'design', 'merchandising'],
    preferred: ['cad', 'trend analysis', 'supply chain', 'retail', 'pattern making'],
    title: 'Apparel / Fashion',
  },
  'ADVOCATE': {
    required: ['legal', 'law', 'litigation', 'contracts', 'compliance', 'counsel'],
    preferred: ['research', 'drafting', 'court', 'negotiation', 'mediation', 'bar'],
    title: 'Legal / Advocate',
  },
};

// ─── ATS Compatibility Checks ──────────────────────────────────────────────────
const ATS_CHECKS = {
  hasContactInfo:  (text) => /\S+@\S+\.\S+/.test(text) && /\d{10}|\+\d{10,}/.test(text),
  hasWorkExp:      (text) => /experience|work history|employment/i.test(text),
  hasEducation:    (text) => /education|degree|university|college|school/i.test(text),
  hasSkills:       (text) => /skills|technologies|tools|competencies/i.test(text),
  hasSummary:      (text) => /summary|objective|profile|about/i.test(text),
  hasProperLength: (text) => text.split(/\s+/).length > 150 && text.split(/\s+/).length < 1200,
  noTablesImages:  (text) => text.length > 100, // If text extracted properly, no image-only resume
  hasActionVerbs:  (text) => {
    const verbs = ['developed', 'managed', 'led', 'created', 'designed', 'implemented',
                   'achieved', 'improved', 'reduced', 'increased', 'built', 'launched'];
    return verbs.some(v => text.toLowerCase().includes(v));
  },
  hasQuantifiables: (text) => /\d+%|\d+\s*(million|thousand|k\b)|\$\d+/i.test(text),
};

// ─── Grammar/Quality Checks ────────────────────────────────────────────────────
const GRAMMAR_CHECKS = {
  noFirstPerson:    (text) => !/\b(I am|I have|I worked|my role)\b/i.test(text),
  noTypos:          (text) => true, // Placeholder — OpenAI handles deeper grammar
  consistentTense:  (text) => true, // Placeholder
  noBuzzwords:      (text) => {
    const buzzwords = ['synergy', 'guru', 'ninja', 'rockstar', 'wizard', 'dynamic'];
    return !buzzwords.some(b => text.toLowerCase().includes(b));
  },
};

/**
 * Calculate keyword match score
 */
const calculateKeywordScore = (text, jobRole) => {
  const roleData = JOB_ROLE_KEYWORDS[jobRole];
  if (!roleData) return { score: 0, matched: [], missing: [] };

  const lowerText = text.toLowerCase();
  const allKeywords = [...roleData.required, ...roleData.preferred];

  const matched = allKeywords.filter(kw => lowerText.includes(kw));
  const missing = allKeywords.filter(kw => !lowerText.includes(kw));

  // Required keywords are weighted more (60% weight)
  const requiredMatched = roleData.required.filter(kw => lowerText.includes(kw));
  const preferredMatched = roleData.preferred.filter(kw => lowerText.includes(kw));

  const requiredScore = (requiredMatched.length / roleData.required.length) * 60;
  const preferredScore = roleData.preferred.length > 0
    ? (preferredMatched.length / roleData.preferred.length) * 40
    : 40;

  return {
    score: Math.round(requiredScore + preferredScore),
    matched,
    missing: missing.slice(0, 10), // Top 10 missing
  };
};

/**
 * Calculate ATS score
 */
const calculateATSScore = (text) => {
  const checks = Object.values(ATS_CHECKS);
  const passed = checks.filter(check => check(text)).length;
  return Math.round((passed / checks.length) * 100);
};

/**
 * Calculate structure score based on detected sections
 */
const calculateStructureScore = (sections) => {
  const importantSections = ['experience', 'education', 'skills', 'summary', 'projects'];
  const present = importantSections.filter(s => sections.includes(s));
  const base = Math.round((present.length / importantSections.length) * 80);
  const bonus = sections.length > 5 ? 20 : sections.length * 4; // Bonus for rich sections
  return Math.min(100, base + bonus);
};

/**
 * Calculate skills score
 */
const calculateSkillsScore = (skills) => {
  if (skills.length === 0) return 0;
  if (skills.length >= 15) return 100;
  return Math.round((skills.length / 15) * 100);
};

/**
 * Generate local suggestions (fast, no API call)
 */
const generateLocalSuggestions = (text, parsedData, jobRole, scores) => {
  const suggestions = [];

  if (scores.atsScore < 60) {
    suggestions.push('📋 Add contact information (email, phone) at the top of your resume.');
  }
  if (!parsedData.sections.includes('summary')) {
    suggestions.push('📝 Add a professional Summary or Objective section at the top.');
  }
  if (parsedData.skills.length < 8) {
    suggestions.push('🛠️ Add more relevant skills — aim for at least 10-15 technical and soft skills.');
  }
  if (!ATS_CHECKS.hasQuantifiables(text)) {
    suggestions.push('📊 Quantify your achievements (e.g., "Increased sales by 30%", "Managed team of 5").');
  }
  if (!ATS_CHECKS.hasActionVerbs(text)) {
    suggestions.push('⚡ Start bullet points with strong action verbs like "Developed", "Led", "Implemented".');
  }
  if (!parsedData.sections.includes('projects')) {
    suggestions.push('💡 Add a Projects section to showcase your practical work.');
  }
  if (scores.keywordScore < 50 && jobRole) {
    suggestions.push(`🔍 Your resume is missing important keywords for ${JOB_ROLE_KEYWORDS[jobRole]?.title || jobRole}. Add them naturally in your experience section.`);
  }
  if (text.split(/\s+/).length < 200) {
    suggestions.push('📄 Your resume seems too short. Add more detail to your experience and projects.');
  }
  if (!GRAMMAR_CHECKS.noFirstPerson(text)) {
    suggestions.push('✍️ Avoid first-person pronouns (I, my, me). Use third person or implied subject.');
  }
  if (!GRAMMAR_CHECKS.noBuzzwords(text)) {
    suggestions.push('🚫 Remove clichéd buzzwords like "guru", "ninja", "rockstar". Use concrete descriptors.');
  }

  return suggestions;
};

/**
 * Use OpenAI to generate deep analysis (optional but powerful)
 */
const generateAIAnalysis = async (resumeText, jobRole, scores) => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    return null; // Skip if API key not set
  }

  try {
    const roleTitle = JOB_ROLE_KEYWORDS[jobRole]?.title || jobRole;
    const prompt = `You are a professional resume reviewer and career coach. Analyze this resume for a ${roleTitle} position.

Resume Text:
"""
${resumeText.substring(0, 3000)}
"""

Current Scores: ATS=${scores.atsScore}/100, Keywords=${scores.keywordScore}/100, Structure=${scores.structureScore}/100

Provide a JSON response with:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "topSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "detailedFeedback": "2-3 sentence paragraph with overall feedback",
  "careerAdvice": "1-2 sentence career tip"
}

Be specific, constructive, and actionable. Focus on ${roleTitle}-specific advice.`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const content = response.data.choices[0].message.content;
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    return null; // Graceful fallback to rule-based
  }
};

/**
 * Main scoring function — orchestrates everything
 */
const scoreResume = async (rawText, parsedData, jobRole) => {
  // Calculate individual scores
  const keywordResult = jobRole
    ? calculateKeywordScore(rawText, jobRole)
    : { score: 50, matched: parsedData.skills.slice(0, 5), missing: [] };

  const atsScore        = calculateATSScore(rawText);
  const structureScore  = calculateStructureScore(parsedData.sections);
  const skillsScore     = calculateSkillsScore(parsedData.skills);
  const keywordScore    = keywordResult.score;

  // Experience score: based on number of experience entries
  const experienceScore = Math.min(100, parsedData.experience.length * 12 + 20);

  // Grammar score: simple checks
  const grammarChecks   = Object.values(GRAMMAR_CHECKS);
  const grammarScore    = Math.round(
    (grammarChecks.filter(c => c(rawText)).length / grammarChecks.length) * 100
  );

  const scores = { atsScore, keywordScore, structureScore, skillsScore, experienceScore, grammarScore };

  // Overall score: weighted average
  const overallScore = Math.round(
    atsScore * 0.25 +
    keywordScore * 0.25 +
    structureScore * 0.15 +
    skillsScore * 0.15 +
    experienceScore * 0.10 +
    grammarScore * 0.10
  );

  // Generate suggestions
  const localSuggestions = generateLocalSuggestions(rawText, parsedData, jobRole, scores);

  // Try OpenAI for richer feedback
  const aiResult = await generateAIAnalysis(rawText, jobRole, scores);

  return {
    overallScore,
    ...scores,
    matchedKeywords: keywordResult.matched,
    missingKeywords: keywordResult.missing,
    suggestions: aiResult
      ? [...localSuggestions, ...aiResult.topSuggestions]
      : localSuggestions,
    strengths:  aiResult?.strengths  || [
      parsedData.skills.length > 5 ? '✅ Good range of technical skills listed' : null,
      parsedData.sections.includes('experience') ? '✅ Experience section present' : null,
      parsedData.sections.includes('education') ? '✅ Education section present' : null,
    ].filter(Boolean),
    weaknesses: aiResult?.weaknesses || [],
    detailedFeedback: aiResult?.detailedFeedback || generateLocalFeedback(overallScore, jobRole),
  };
};

const generateLocalFeedback = (score, jobRole) => {
  if (score >= 80) return `Excellent resume! Strong ATS compatibility and keyword alignment for ${jobRole || 'your target role'}. Minor polish can push it to perfect.`;
  if (score >= 60) return `Good foundation, but there's room to improve. Focus on adding more role-specific keywords and quantifying your achievements.`;
  if (score >= 40) return `Your resume needs significant improvements. Key sections may be missing or underdeveloped. Follow the suggestions below to boost your score.`;
  return `Your resume needs a major overhaul. Start by ensuring all key sections (Summary, Experience, Skills, Education) are present and well-developed.`;
};

// ─── Career Guidance Engine ────────────────────────────────────────────────────
const CAREER_GUIDANCE = {
  'INFORMATION-TECHNOLOGY': {
    courses: [
      { title: 'Full Stack Web Development', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org' },
      { title: 'AWS Cloud Practitioner', platform: 'AWS Training', url: 'https://aws.amazon.com/training' },
      { title: 'System Design Primer', platform: 'GitHub', url: 'https://github.com/donnemartin/system-design-primer' },
    ],
    projects: ['Build a REST API with Node.js & MongoDB', 'Create a React dashboard with real-time data', 'Deploy a containerized app on AWS/GCP'],
    skills: ['System Design', 'Cloud Computing (AWS/Azure)', 'Docker & Kubernetes', 'TypeScript'],
    paths: ['Software Engineer → Senior Engineer → Tech Lead → Engineering Manager', 'Full Stack → DevOps Engineer → Cloud Architect'],
  },
  'FINANCE': {
    courses: [
      { title: 'Financial Modeling & Valuation', platform: 'CFI', url: 'https://corporatefinanceinstitute.com' },
      { title: 'CFA Exam Prep', platform: 'Kaplan', url: 'https://www.kaplan.com/cfa' },
      { title: 'Excel for Finance', platform: 'Coursera', url: 'https://www.coursera.org' },
    ],
    projects: ['Build a DCF valuation model', 'Portfolio tracker with Python', 'Personal finance dashboard'],
    skills: ['Financial Modeling', 'Python for Finance', 'Bloomberg Terminal', 'CFA Certification'],
    paths: ['Analyst → Associate → VP → Director → MD'],
  },
  'HR': {
    courses: [
      { title: 'SHRM-CP Certification', platform: 'SHRM', url: 'https://www.shrm.org' },
      { title: 'People Analytics', platform: 'Coursera', url: 'https://www.coursera.org' },
      { title: 'Talent Acquisition Fundamentals', platform: 'LinkedIn Learning', url: 'https://linkedin.com/learning' },
    ],
    projects: ['Design an onboarding process', 'Create employee engagement survey', 'HR metrics dashboard'],
    skills: ['People Analytics', 'HRIS Systems', 'DEI Strategy', 'Talent Management'],
    paths: ['HR Coordinator → HR Manager → HR Business Partner → Chief People Officer'],
  },
  'HEALTHCARE': {
    courses: [
      { title: 'Medical Terminology', platform: 'Coursera', url: 'https://www.coursera.org' },
      { title: 'HIPAA Compliance', platform: 'MedBridge', url: 'https://medbridge.com' },
      { title: 'Healthcare Management', platform: 'edX', url: 'https://www.edx.org' },
    ],
    projects: ['Patient care process improvement', 'EHR workflow optimization', 'Health data analysis project'],
    skills: ['EHR/EMR Systems', 'Clinical Documentation', 'Telemedicine', 'BLS/ACLS Certification'],
    paths: ['Clinical Role → Senior Clinician → Department Head → Healthcare Administrator'],
  },
  'DESIGNER': {
    courses: [
      { title: 'UI/UX Design Bootcamp', platform: 'Udemy', url: 'https://www.udemy.com' },
      { title: 'Google UX Design Certificate', platform: 'Coursera', url: 'https://www.coursera.org' },
      { title: 'Advanced Figma', platform: 'Figma Academy', url: 'https://www.figma.com' },
    ],
    projects: ['Redesign a popular app UI', 'Build a design system', 'Case study: end-to-end UX process'],
    skills: ['User Research', 'Motion Design', 'Accessibility (WCAG)', 'Design Systems'],
    paths: ['Junior Designer → Mid Designer → Senior Designer → Design Lead → Head of Design'],
  },
};

const getCareerGuidance = (jobRole, missingSkills) => {
  const guidance = CAREER_GUIDANCE[jobRole] || {
    courses: [
      { title: 'Professional Development', platform: 'Coursera', url: 'https://www.coursera.org' },
      { title: 'LinkedIn Learning Paths', platform: 'LinkedIn', url: 'https://linkedin.com/learning' },
    ],
    projects: ['Build a portfolio project in your field', 'Contribute to open source', 'Write technical blog posts'],
    skills: missingSkills.slice(0, 5),
    paths: ['Entry Level → Mid Level → Senior Level → Lead/Manager'],
  };

  return {
    recommendedCourses:  guidance.courses,
    recommendedProjects: guidance.projects,
    skillsToLearn:       guidance.skills,
    careerPaths:         guidance.paths,
    generatedAt:         new Date(),
  };
};

module.exports = { scoreResume, getCareerGuidance, JOB_ROLE_KEYWORDS };