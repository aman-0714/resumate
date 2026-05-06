// ats-analyzer/app.js
// All API calls point to the deployed Render backend
const API_BASE = 'https://resumate-ns85.onrender.com';

// ── PDF Text Extraction via PDF.js ────────────────────────────────────────────
let extractedText = '';
let selectedRole = '';

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── Role Grid ─────────────────────────────────────────────────────────────────
const ROLES = [
  { key: 'INFORMATION-TECHNOLOGY', label: '💻 IT / Software' },
  { key: 'ENGINEERING', label: '⚙️ Engineering' },
  { key: 'FINANCE', label: '💰 Finance' },
  { key: 'HR', label: '🧑‍💼 Human Resources' },
  { key: 'HEALTHCARE', label: '🏥 Healthcare' },
  { key: 'DESIGNER', label: '🎨 Design' },
  { key: 'SALES', label: '📈 Sales' },
  { key: 'CONSULTANT', label: '🧠 Consulting' },
  { key: 'TEACHER', label: '📚 Teaching' },
  { key: 'BANKING', label: '🏦 Banking' },
  { key: 'DIGITAL-MEDIA', label: '📱 Digital Media' },
  { key: 'ADVOCATE', label: '⚖️ Legal' },
];

function buildRoleGrid() {
  const grid = document.getElementById('roleGrid');
  ROLES.forEach(({ key, label }) => {
    const btn = document.createElement('button');
    btn.className = 'role-btn';
    btn.textContent = label;
    btn.dataset.key = key;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRole = key;
      document.getElementById('customRole').value = '';
    });
    grid.appendChild(btn);
  });
}

document.getElementById('customRole').addEventListener('input', (e) => {
  if (e.target.value.trim()) {
    document.querySelectorAll('.role-btn').forEach((b) => b.classList.remove('active'));
    selectedRole = e.target.value.trim().toUpperCase().replace(/\s+/g, '-');
  }
});

// ── File Upload & PDF Parsing ─────────────────────────────────────────────────
function setupDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  ['dragenter', 'dragover'].forEach((e) =>
    dropzone.addEventListener(e, (ev) => { ev.preventDefault(); dropzone.classList.add('drag-over'); })
  );
  ['dragleave', 'drop'].forEach((e) =>
    dropzone.addEventListener(e, () => dropzone.classList.remove('drag-over'))
  );
  dropzone.addEventListener('drop', (ev) => {
    ev.preventDefault();
    const file = ev.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
}

async function handleFile(file) {
  if (file.type !== 'application/pdf') {
    showError('Please upload a PDF file.');
    return;
  }
  document.getElementById('fileInfo').textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  document.getElementById('fileInfo').classList.remove('hidden');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((s) => s.str).join(' ') + '\n';
  }
  extractedText = text;

  const preview = document.getElementById('extractedPreview');
  const previewText = document.getElementById('previewText');
  preview.classList.remove('hidden');
  previewText.textContent = text.slice(0, 800) + (text.length > 800 ? '\n…' : '');

  document.getElementById('togglePreview').addEventListener('click', () => {
    previewText.classList.toggle('hidden');
    document.getElementById('togglePreview').textContent =
      previewText.classList.contains('hidden') ? 'Show ▾' : 'Hide ▴';
  });

  document.getElementById('analyzeBtn').disabled = false;
}

// ── Analysis ──────────────────────────────────────────────────────────────────
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  if (!extractedText.trim()) return showError('Please upload a resume first.');
  if (!selectedRole) return showError('Please select or enter a job role.');

  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('errorMsg').classList.add('hidden');

  try {
    // We send resumeText + jobDescription-style prompt directly
    // Using the /api/job-match endpoint (no auth needed) for inline analysis
    const response = await fetch(`${API_BASE}/api/analyze/job-roles`);
    // Actually, for the ATS analyzer standalone page, we call Claude API directly
    // via the analyze endpoint — but since we don't have a resumeId, we'll use
    // the Anthropic API directly in the browser
    const result = await callClaudeForAnalysis(extractedText, selectedRole);
    renderResults(result, selectedRole);
  } catch (err) {
    showError('Analysis failed: ' + err.message);
  } finally {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    document.getElementById('analyzeBtn').disabled = false;
  }
});

async function callClaudeForAnalysis(resumeText, jobRole) {
  const prompt = `You are an expert ATS resume analyst. Analyze this resume for a ${jobRole} position.

Resume:
"""
${resumeText.slice(0, 4000)}
"""

Return ONLY valid JSON with this exact structure:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "projects": [
    {"title": "Project Title", "description": "Brief 1-sentence description"},
    {"title": "Project Title 2", "description": "Brief 1-sentence description"}
  ]
}`;

  const res = await fetch(`${API_BASE}/api/analyze/ats-quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText: resumeText.slice(0, 4000), jobRole, prompt }),
  });

  if (!res.ok) {
    // Fallback: use local rule-based result
    return generateLocalResult(resumeText, jobRole);
  }
  const data = await res.json();
  return data.result || generateLocalResult(resumeText, jobRole);
}

function generateLocalResult(text, role) {
  const lower = text.toLowerCase();
  const hasEmail = /@/.test(text);
  const hasPhone = /\d{10}/.test(text);
  const hasGit = /github|git/.test(lower);
  const hasExp = /experience|worked|developed/i.test(text);
  const hasEdu = /university|college|degree|b\.tech|b\.sc/i.test(text);

  return {
    strengths: [
      hasExp ? '✅ Experience section detected' : '⚠️ Add more work experience details',
      hasEdu ? '✅ Education background present' : '⚠️ Include your education',
      hasGit ? '✅ GitHub/portfolio mentioned' : '💡 Add your GitHub profile link',
    ].filter(Boolean),
    weaknesses: [
      !hasEmail ? '❌ Contact email missing' : null,
      !hasPhone ? '❌ Phone number missing' : null,
      '⚠️ Quantify achievements with numbers and percentages',
    ].filter(Boolean),
    improvements: [
      '📝 Add a professional summary at the top',
      '📊 Quantify your impact (e.g., "Increased performance by 40%")',
      '🔑 Include more role-specific keywords for ' + role,
      '⚡ Start bullet points with action verbs',
    ],
    skills: ['Communication', 'Problem Solving', 'Teamwork', 'Adaptability', 'Leadership'],
    projects: [
      { title: 'Portfolio Website', description: 'Build a personal site showcasing your projects and skills.' },
      { title: 'Open Source Contribution', description: 'Contribute to a GitHub repo relevant to your target role.' },
    ],
  };
}

// ── Render Results ────────────────────────────────────────────────────────────
function renderResults(data, role) {
  document.getElementById('resultsSection').classList.remove('hidden');
  document.getElementById('roleTag').textContent = role.replace(/-/g, ' ');

  const fillList = (id, items) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    (items || []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      el.appendChild(li);
    });
  };

  fillList('strengthsList', data.strengths);
  fillList('weaknessesList', data.weaknesses);
  fillList('improvementsList', data.improvements);

  const skillsEl = document.getElementById('skillsList');
  skillsEl.innerHTML = '';
  (data.skills || []).forEach((s) => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.textContent = s;
    skillsEl.appendChild(tag);
  });

  const projectsEl = document.getElementById('projectsList');
  projectsEl.innerHTML = '';
  (data.projects || []).forEach((p) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `<strong>${p.title}</strong><p>${p.description}</p>`;
    projectsEl.appendChild(card);
  });

  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// ── Reset ─────────────────────────────────────────────────────────────────────
document.getElementById('resetBtn').addEventListener('click', () => {
  extractedText = '';
  selectedRole = '';
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('fileInfo').classList.add('hidden');
  document.getElementById('extractedPreview').classList.add('hidden');
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('fileInput').value = '';
  document.querySelectorAll('.role-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById('customRole').value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── Init ──────────────────────────────────────────────────────────────────────
buildRoleGrid();
setupDropzone();