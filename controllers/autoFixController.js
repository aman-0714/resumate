'use strict';
const Resume = require('../models/Resume');
const { JOB_ROLE_KEYWORDS } = require('../utils/aiScorer');

const WEAK_VERB_MAP = {
  'worked on':'Developed','helped':'Supported','assisted':'Collaborated on',
  'did':'Executed','was responsible':'Managed','involved in':'Contributed to',
  'tried':'Implemented','got':'Achieved','made':'Produced',
};

const rewriteBullet = (line) => {
  let r = line.trim().replace(/^[\•\-\*▪►◆▸·–]\s*/,'');
  for (const [w,s] of Object.entries(WEAK_VERB_MAP)){
    const re = new RegExp(`^${w}\\b`,'i');
    if (re.test(r)) { r = r.replace(re, s); break; }
  }
  r = r.replace(/^I\s+(am|was|have|worked|helped|built|led)\b\s*/i, '');
  return '• ' + r.charAt(0).toUpperCase() + r.slice(1);
};

const generateSummary = (parsedData, jobRole) => {
  const roleTitle = JOB_ROLE_KEYWORDS[jobRole]?.title || (jobRole ? jobRole.replace(/-/g,' ') : 'target role');
  const topSkills = (parsedData?.skills || []).slice(0, 4).join(', ') || 'relevant technologies';
  return `Motivated ${roleTitle} with hands-on experience in ${topSkills}. Proven ability to deliver results through analytical thinking and collaborative execution. Seeking a dynamic ${roleTitle} opportunity to apply technical skills and drive impact.`;
};

const generateAutoFixes = (rawText, parsedData, analysis) => {
  const fixes = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.filter(l => /^[\•\-\*▪►◆▸·–]\s+/.test(l) || /^\d+[\.\)]\s+/.test(l));
  const WEAK = /^(worked|helped|assisted|did |was responsible|involved|got |made |tried )/i;
  const weakBullets = bulletLines.filter(l => WEAK.test(l.replace(/^[\•\-\*▪►◆▸·–\d\.\)]\s*/,'')));

  if (!analysis?.sections?.summary)
    fixes.push({ type:'ADD_SECTION', section:'Summary', priority:'high',
      issue:'No Summary/Objective section detected.',
      suggestion: generateSummary(parsedData, analysis?.selectedJobRole),
      label:'+ Add Professional Summary' });

  if (weakBullets.length > 0)
    fixes.push({ type:'REWRITE_BULLETS', section:'Experience / Projects', priority:'high',
      issue:`${weakBullets.length} bullet(s) start with weak verbs.`,
      originals: weakBullets.slice(0,5), rewrites: weakBullets.slice(0,5).map(rewriteBullet),
      label:'✏️ Strengthen Action Verbs' });

  const hasNumbers = /\d+\s*(%|million|thousand|\+|users|students|members|events|k\b)/i.test(rawText);
  if (!hasNumbers)
    fixes.push({ type:'ADD_METRICS', section:'Experience / Projects', priority:'high',
      issue:'No quantifiable achievements detected.',
      examples:[
        '• Led a team of 5 to deliver the project 2 weeks ahead of schedule.',
        '• Reduced processing time by 30% through algorithm optimization.',
        '• Organized event for 200+ participants with 95% satisfaction rate.',
        '• Achieved 91.4% in board exams, ranking in top 5% of class.',
      ], label:'📊 Add Measurable Impact' });

  const missing = analysis?.keywords?.missing || [];
  if (missing.length > 0) {
    const roleTitle = JOB_ROLE_KEYWORDS[analysis?.selectedJobRole]?.title || 'target role';
    fixes.push({ type:'ADD_KEYWORDS', section:'Skills', priority:'medium',
      issue:`${missing.length} important keywords missing for ${roleTitle}.`,
      keywords: missing.slice(0,8),
      suggestion:`Add to your Skills section: ${missing.slice(0,6).join(', ')}.`,
      label:'🔑 Add Missing Keywords' });
  }

  if (!analysis?.sections?.projects)
    fixes.push({ type:'ADD_SECTION', section:'Projects', priority:'medium',
      issue:'No Projects section found.',
      suggestion:'## Projects\n\n**Project Name** | Tech Stack | GitHub Link\n• Describe what you built and why.\n• Describe the impact or result (users, accuracy, performance).',
      label:'+ Add Projects Section' });

  if (!analysis?.sections?.certifications)
    fixes.push({ type:'ADD_SECTION', section:'Certifications', priority:'low',
      issue:'No Certifications section found.',
      suggestion:'## Certifications\n• Course Name — Platform — Month Year\n• Example: ML Specialization — Coursera — Jan 2024',
      label:'+ Add Certifications' });

  return fixes;
};

const autoFixResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ success:false, message:'Resume not found.' });
    if (!resume.rawText) return res.status(400).json({ success:false, message:'Resume text not available.' });
    const fixes = generateAutoFixes(resume.rawText, resume.parsedData, resume.analysis);
    return res.json({ success:true, count:fixes.length, fixes });
  } catch (err) {
    console.error('[autoFix]', err.message);
    return res.status(500).json({ success:false, message:'Auto-fix failed.' });
  }
};

module.exports = { autoFixResume };
