// utils/jobMatcher.js
// ─── NLP Job-Role Matching Engine ─────────────────────────────────────────────
// Uses TF-IDF-style keyword weighting + cosine similarity to compute a
// match score between resume text and a job description.
// No external NLP library needed — pure JS, runs server-side.

// ─── Stop-words to strip before keyword extraction ────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'shall','can','need','must','that','this','these','those','i','we',
  'you','he','she','they','it','its','our','your','their','my','his','her',
  'as','if','so','then','than','also','just','not','no','more','about',
  'up','out','into','over','such','all','any','both','each','few','most',
  'other','some','well','when','where','which','who','how','what','etc',
]);

// ─── Boost weights for high-signal tech / skill tokens ────────────────────────
const SKILL_BOOST = {
  // Languages
  python:3, javascript:3, typescript:3, java:3, 'c++':3, golang:3, rust:3,
  ruby:2, php:2, swift:2, kotlin:2, scala:2, r:2,
  // Frontend
  react:3, vue:3, angular:3, nextjs:3, html:2, css:2, tailwind:2,
  // Backend
  nodejs:3, express:2, django:3, fastapi:2, flask:2, springboot:2,
  graphql:2, rest:2, api:2,
  // Data / ML
  tensorflow:3, pytorch:3, 'scikit-learn':3, pandas:2, numpy:2,
  'machine learning':3, 'deep learning':3, nlp:3, llm:2, opencv:2,
  // Cloud / DevOps
  aws:3, azure:3, gcp:3, docker:3, kubernetes:3, terraform:2, ci:2, cd:2,
  'github actions':2, jenkins:2, linux:2,
  // Databases
  mongodb:2, postgresql:2, mysql:2, redis:2, elasticsearch:2, sql:2,
  // Soft skills (lower boost)
  leadership:1.5, communication:1.5, teamwork:1.5, agile:1.5, scrum:1.5,
};

// ─── 1. Tokenise & clean text ─────────────────────────────────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9#+.\-\s]/g, ' ')   // keep # (C#), + (C++), . (node.js)
    .split(/\s+/)
    .map(t => t.replace(/^[.\-]+|[.\-]+$/g, '')) // strip leading/trailing dots
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

// ─── 2. Build term-frequency map ─────────────────────────────────────────────
function termFrequency(tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  return tf;
}

// ─── 3. Extract top-N keywords with TF × skill-boost weight ──────────────────
function extractKeywords(text, topN = 40) {
  const tokens = tokenize(text);
  const tf = termFrequency(tokens);
  const total = tokens.length || 1;

  // Also try bigrams for multi-word skills (e.g. "machine learning")
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  const bigramTf = termFrequency(bigrams);

  const scored = {};

  // Unigrams
  for (const [term, count] of Object.entries(tf)) {
    const boost = SKILL_BOOST[term] || 1;
    scored[term] = (count / total) * boost;
  }

  // Bigrams (only include if they match a known skill)
  for (const [bigram, count] of Object.entries(bigramTf)) {
    if (SKILL_BOOST[bigram]) {
      scored[bigram] = (count / total) * SKILL_BOOST[bigram];
    }
  }

  return Object.entries(scored)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([term, score]) => ({ term, score: +score.toFixed(4) }));
}

// ─── 4. Build weighted TF-IDF vector for cosine similarity ───────────────────
function buildVector(keywords, universe) {
  const vec = new Array(universe.length).fill(0);
  const kMap = Object.fromEntries(keywords.map(k => [k.term, k.score]));
  universe.forEach((term, i) => {
    vec[i] = kMap[term] || 0;
  });
  return vec;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot  += vecA[i] * vecB[i];
    magA += vecA[i] ** 2;
    magB += vecB[i] ** 2;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ─── 5. Core matcher ─────────────────────────────────────────────────────────
/**
 * matchJobRole(resumeText, jobDescriptionText)
 *
 * Returns a structured JSON result:
 * {
 *   matchScore        : number  (0–100),
 *   cosineSimilarity  : number  (0–1),
 *   grade             : string  ("Excellent" | "Good" | "Fair" | "Weak"),
 *   resumeKeywords    : [{ term, score }],
 *   jobKeywords       : [{ term, score }],
 *   matchedSkills     : string[],
 *   missingSkills     : string[],
 *   bonusSkills       : string[],   // in resume but NOT in JD (extra value)
 *   recommendation    : string,
 * }
 */
function matchJobRole(resumeText, jobDescriptionText) {
  if (!resumeText || !jobDescriptionText) {
    throw new Error('Both resumeText and jobDescriptionText are required.');
  }

  const resumeKW  = extractKeywords(resumeText, 50);
  const jobKW     = extractKeywords(jobDescriptionText, 50);

  // Universe = union of all terms from both docs
  const universe  = [...new Set([...resumeKW, ...jobKW].map(k => k.term))];

  const vecResume = buildVector(resumeKW, universe);
  const vecJob    = buildVector(jobKW,    universe);

  const cosine    = cosineSimilarity(vecResume, vecJob);

  // Keyword sets for overlap analysis
  const resumeTerms = new Set(resumeKW.map(k => k.term));
  const jobTerms    = new Set(jobKW.map(k => k.term));

  const matchedSkills = [...jobTerms].filter(t => resumeTerms.has(t));
  const missingSkills = [...jobTerms].filter(t => !resumeTerms.has(t));
  const bonusSkills   = [...resumeTerms].filter(t => !jobTerms.has(t));

  // ── Score formula ────────────────────────────────────────────────────────
  // cosine similarity accounts for 60% of score (term importance weighted)
  // keyword overlap ratio accounts for 40% (raw skill coverage)
  const overlapRatio  = jobTerms.size > 0 ? matchedSkills.length / jobTerms.size : 0;
  const rawScore      = (cosine * 0.60 + overlapRatio * 0.40) * 100;
  const matchScore    = Math.min(100, Math.round(rawScore));

  const gradeMap = [[85,'Excellent'],[70,'Good'],[50,'Fair'],[0,'Weak']];
  const grade = gradeMap.find(([t]) => matchScore >= t)[1];

  const recMap = {
    Excellent : 'Strong match — tailor your summary to mirror the JD language and apply confidently.',
    Good      : 'Good fit — add the missing skills to your resume or cover letter to push past 85.',
    Fair      : 'Partial match — invest time in learning the top missing skills before applying.',
    Weak      : 'Low match — consider upskilling or targeting roles that better align with your current skill set.',
  };

  return {
    matchScore,
    cosineSimilarity : +cosine.toFixed(4),
    grade,
    resumeKeywords   : resumeKW.slice(0, 20),
    jobKeywords      : jobKW.slice(0, 20),
    matchedSkills    : matchedSkills.slice(0, 30),
    missingSkills    : missingSkills.slice(0, 30),
    bonusSkills      : bonusSkills.slice(0, 15),
    recommendation   : recMap[grade],
    meta: {
      resumeTermCount : resumeTerms.size,
      jobTermCount    : jobTerms.size,
      overlapCount    : matchedSkills.length,
      overlapRatio    : +overlapRatio.toFixed(4),
    },
  };
}

module.exports = { matchJobRole, extractKeywords };
