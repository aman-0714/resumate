# Job-Role Matching System 🔍

An NLP-based resume ↔ job-description matcher using **TF-IDF** and **Cosine Similarity**.  
Zero external dependencies — pure Python standard library only.

---

## 📁 File Structure

```
job_matcher/
├── matcher.py        # Core engine (TF-IDF, cosine similarity, skill gap)
├── batch_match.py    # Batch processing → CSV report
├── candidates.json   # Sample input for batch mode
├── match_result.json # Auto-generated after single run
├── results.csv       # Auto-generated after batch run
└── README.md
```

---

## ⚙️ How It Works

### Step 1 — Keyword Extraction
- Lowercase + regex tokenise (`[a-z0-9]+`)
- Expand tech abbreviations (`js → javascript`, `k8s → kubernetes`, etc.)
- Remove stop words
- Count top-N tokens with `collections.Counter`

### Step 2 — TF-IDF Vectorisation
```
TF(w, doc)  = count(w) / total_words(doc)
IDF(w)      = log((N+1) / (df+1)) + 1   # smoothed
TF-IDF(w)   = TF × IDF
```
Both resume and JD are vectorised in the same shared vocabulary.

### Step 3 — Cosine Similarity
```
cos(θ) = (Resume · JD) / (|Resume| × |JD|)
```
- **0.0** → zero keyword overlap  
- **1.0** → identical keyword distributions  
- Multiply by 100 for a human-readable percentage score

### Step 4 — Skill Gap Analysis
- **Matched Skills** = JD keywords found in resume token set  
- **Missing Skills** = JD keywords absent from resume token set

---

## 🚀 Usage

### Single Match (Demo)
```bash
cd job_matcher
python matcher.py
```

### Single Match (Interactive — paste your own resume & JD)
```bash
python matcher.py --interactive
```

### Batch Match (multiple candidates from JSON)
```bash
python batch_match.py
```

---

## 📤 Output Format

### Console
```
═══════════════════════════════════════════════════════
  JOB-ROLE MATCH REPORT
═══════════════════════════════════════════════════════
  Score   : 73.4%  →  Good 🟢
  Cosine  : 0.734
───────────────────────────────────────────────────────
  ✅ MATCHED SKILLS (12)
     • aws
     • docker
     • machine learning
     • nlp
     • python
     • sql
     • tensorflow
     ...
───────────────────────────────────────────────────────
  ❌ MISSING SKILLS (4)
     • cicd
     • kubernetes
     • mlops
     • pytorch
───────────────────────────────────────────────────────
  💡 RECOMMENDATION
     Good fit. Consider adding: cicd, kubernetes, mlops, pytorch
═══════════════════════════════════════════════════════
```

### JSON (`match_result.json`)
```json
{
  "match_score": {
    "cosine_similarity": 0.734,
    "percentage": 73.4,
    "grade": "Good 🟢"
  },
  "resume_top_keywords": { "python": 3, "machine learning": 2, ... },
  "jd_top_keywords":     { "python": 2, "docker": 1, ... },
  "matched_skills":  ["aws", "docker", "machine learning", "python", ...],
  "missing_skills":  ["cicd", "kubernetes", "mlops", "pytorch"],
  "recommendation":  "Good fit. Consider adding: cicd, kubernetes, mlops, pytorch"
}
```

### CSV (`results.csv`) — batch mode
| Name | Score (%) | Grade | Matched Skills | Missing Skills | Recommendation |
|------|-----------|-------|----------------|----------------|----------------|

---

## 📊 Score Grading
| Range | Grade |
|-------|-------|
| 80–100% | Excellent ✅ |
| 60–79%  | Good 🟢 |
| 40–59%  | Fair 🟡 |
| 0–39%   | Needs Work 🔴 |

---

## 🔧 Customisation
- Add more synonyms in `SKILL_SYNONYMS` dict inside `matcher.py`
- Adjust `top_n` in `extract_keywords()` to widen/narrow keyword pool
- Swap TF-IDF weights with domain-specific boosts for specialised roles
