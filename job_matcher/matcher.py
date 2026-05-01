"""
Job-Role Matching System
========================
NLP-based resume ↔ job description matcher using TF-IDF + Cosine Similarity.

Usage:
    python matcher.py                  # runs built-in demo
    python matcher.py --interactive    # enter your own resume & JD
"""

import re
import math
import json
import argparse
from collections import Counter


# ─────────────────────────────────────────────
# 1. STOP WORDS
# ─────────────────────────────────────────────
STOP_WORDS = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "is","are","was","were","be","been","being","have","has","had","do","does",
    "did","will","would","could","should","may","might","shall","can","need",
    "i","you","he","she","it","we","they","this","that","these","those",
    "my","your","his","her","its","our","their","me","him","us","them",
    "not","no","nor","so","yet","both","either","neither","each","every",
    "all","any","few","more","most","other","some","such","as","if","than",
    "then","because","while","although","since","after","before","when","where",
    "who","whom","which","what","how","why","about","above","across","after",
    "against","along","among","around","because","between","by","during",
    "except","from","into","through","under","until","up","upon","within",
}


# ─────────────────────────────────────────────
# 2. TECH / DOMAIN SKILL SYNONYMS
# ─────────────────────────────────────────────
SKILL_SYNONYMS = {
    "js": "javascript", "typescript": "typescript", "ts": "typescript",
    "py": "python", "ml": "machine learning", "ai": "artificial intelligence",
    "dl": "deep learning", "nlp": "natural language processing",
    "cv": "computer vision", "api": "api", "rest": "rest api",
    "sql": "sql", "nosql": "nosql", "db": "database",
    "aws": "aws", "gcp": "google cloud", "azure": "azure",
    "k8s": "kubernetes", "ci/cd": "cicd", "oop": "object oriented programming",
    "ds": "data structures", "algo": "algorithms",
}


# ─────────────────────────────────────────────
# 3. KEYWORD EXTRACTION
# ─────────────────────────────────────────────
def preprocess(text: str) -> list[str]:
    """Lowercase, expand synonyms, remove stop-words, return token list."""
    text = text.lower()
    # keep alphanumeric + slashes for things like ci/cd
    tokens = re.findall(r"[a-z0-9]+(?:[/+#][a-z0-9]+)*", text)
    # synonym normalization
    tokens = [SKILL_SYNONYMS.get(t, t) for t in tokens]
    # remove stop words and single chars
    tokens = [t for t in tokens if t not in STOP_WORDS and len(t) > 1]
    return tokens


def extract_keywords(text: str, top_n: int = 40) -> dict[str, int]:
    """Return {keyword: raw_count} for top_n most frequent tokens."""
    tokens = preprocess(text)
    freq = Counter(tokens)
    return dict(freq.most_common(top_n))


# ─────────────────────────────────────────────
# 4. TF-IDF VECTORISER (corpus = [resume, jd])
# ─────────────────────────────────────────────
def compute_tf(tokens: list[str]) -> dict[str, float]:
    total = len(tokens) or 1
    counts = Counter(tokens)
    return {w: c / total for w, c in counts.items()}


def compute_idf(corpus_tokens: list[list[str]]) -> dict[str, float]:
    N = len(corpus_tokens)
    all_words = set(w for doc in corpus_tokens for w in doc)
    idf = {}
    for word in all_words:
        df = sum(1 for doc in corpus_tokens if word in doc)
        idf[word] = math.log((N + 1) / (df + 1)) + 1   # smoothed
    return idf


def tfidf_vector(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    tf = compute_tf(tokens)
    return {w: tf[w] * idf.get(w, 1.0) for w in tf}


# ─────────────────────────────────────────────
# 5. COSINE SIMILARITY
# ─────────────────────────────────────────────
def cosine_similarity(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    """
    Formula:
        cos(θ) = (A · B) / (|A| × |B|)
    Score range: 0.0 (no overlap) → 1.0 (identical)
    """
    common = set(vec_a) & set(vec_b)
    dot = sum(vec_a[w] * vec_b[w] for w in common)
    mag_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
    mag_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return round(dot / (mag_a * mag_b), 4)


# ─────────────────────────────────────────────
# 6. SKILL GAP ANALYSER
# ─────────────────────────────────────────────
def analyse_skills(
    resume_tokens: list[str],
    jd_tokens: list[str],
    jd_keywords: dict[str, int],
) -> tuple[list[str], list[str]]:
    """
    Returns:
        matched_skills  – JD keywords present in resume
        missing_skills  – JD keywords absent from resume
    """
    resume_set = set(resume_tokens)
    matched, missing = [], []
    for skill in jd_keywords:
        if skill in resume_set:
            matched.append(skill)
        else:
            missing.append(skill)
    return matched, missing


# ─────────────────────────────────────────────
# 7. MASTER MATCH FUNCTION
# ─────────────────────────────────────────────
def match(resume_text: str, jd_text: str, top_n: int = 30) -> dict:
    """
    Full pipeline. Returns a structured result dict.
    """
    resume_tokens = preprocess(resume_text)
    jd_tokens     = preprocess(jd_text)

    # TF-IDF
    idf    = compute_idf([resume_tokens, jd_tokens])
    vec_r  = tfidf_vector(resume_tokens, idf)
    vec_jd = tfidf_vector(jd_tokens, idf)

    # Cosine score
    score = cosine_similarity(vec_r, vec_jd)

    # Keyword extraction
    resume_kw = extract_keywords(resume_text, top_n)
    jd_kw     = extract_keywords(jd_text, top_n)

    # Skill gap
    matched, missing = analyse_skills(resume_tokens, jd_tokens, jd_kw)

    # Percentage score (0–100)
    match_pct = round(score * 100, 2)

    return {
        "match_score": {
            "cosine_similarity": score,
            "percentage": match_pct,
            "grade": _grade(match_pct),
        },
        "resume_top_keywords": resume_kw,
        "jd_top_keywords": jd_kw,
        "matched_skills": sorted(matched),
        "missing_skills": sorted(missing),
        "recommendation": _recommend(match_pct, missing),
    }


def _grade(pct: float) -> str:
    if pct >= 80: return "Excellent ✅"
    if pct >= 60: return "Good 🟢"
    if pct >= 40: return "Fair 🟡"
    return "Needs Work 🔴"


def _recommend(pct: float, missing: list[str]) -> str:
    top_missing = ", ".join(missing[:5]) if missing else "none"
    if pct >= 80:
        return f"Strong match! Minor gaps: {top_missing}"
    if pct >= 60:
        return f"Good fit. Consider adding: {top_missing}"
    if pct >= 40:
        return f"Moderate match. Key missing skills: {top_missing}"
    return f"Low match. Critical skills to acquire: {top_missing}"


# ─────────────────────────────────────────────
# 8. PRETTY PRINTER
# ─────────────────────────────────────────────
def print_report(result: dict) -> None:
    sep = "─" * 55
    ms  = result["match_score"]
    print(f"\n{'═'*55}")
    print(f"  JOB-ROLE MATCH REPORT")
    print(f"{'═'*55}")
    print(f"  Score   : {ms['percentage']}%  →  {ms['grade']}")
    print(f"  Cosine  : {ms['cosine_similarity']}")
    print(sep)
    print(f"  ✅ MATCHED SKILLS ({len(result['matched_skills'])})")
    for s in result["matched_skills"]:
        print(f"     • {s}")
    print(sep)
    print(f"  ❌ MISSING SKILLS ({len(result['missing_skills'])})")
    for s in result["missing_skills"]:
        print(f"     • {s}")
    print(sep)
    print(f"  💡 RECOMMENDATION")
    print(f"     {result['recommendation']}")
    print(f"{'═'*55}\n")


# ─────────────────────────────────────────────
# 9. CLI ENTRY POINT
# ─────────────────────────────────────────────
DEMO_RESUME = """
John Doe | john@email.com | github.com/johndoe
Skills: Python, Machine Learning, Deep Learning, TensorFlow, PyTorch,
        Scikit-learn, NLP, SQL, REST API, Docker, Git, AWS
Experience:
  - ML Engineer at TechCorp (2021–2024): Built NLP pipelines using Python
    and PyTorch. Deployed models on AWS using Docker and Kubernetes.
  - Data Analyst at DataLtd (2019–2021): SQL, pandas, data visualization,
    Tableau, statistical analysis.
Education: B.Tech Computer Science, 2019
"""

DEMO_JD = """
Senior Machine Learning Engineer — AI Products Team
Requirements:
  - 3+ years Python, TensorFlow or PyTorch, Scikit-learn
  - Production ML pipelines, MLOps, model deployment
  - NLP / LLM fine-tuning experience
  - Cloud platforms: AWS or GCP
  - Docker, Kubernetes, CI/CD pipelines
  - Strong SQL and data engineering fundamentals
  - Experience with REST APIs and microservices
  - Communication skills, agile teamwork
Nice to have: Spark, Kafka, Airflow, React
"""


def interactive_mode():
    print("\n─── JOB MATCHER: Interactive Mode ───")
    print("Paste your RESUME text (end with a line containing only 'END'):")
    lines = []
    while True:
        line = input()
        if line.strip().upper() == "END":
            break
        lines.append(line)
    resume = "\n".join(lines)

    print("\nPaste the JOB DESCRIPTION text (end with 'END'):")
    lines = []
    while True:
        line = input()
        if line.strip().upper() == "END":
            break
        lines.append(line)
    jd = "\n".join(lines)

    result = match(resume, jd)
    print_report(result)
    with open("match_result.json", "w") as f:
        json.dump(result, f, indent=2)
    print("Full result saved → match_result.json\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Job-Role Matching System")
    parser.add_argument("--interactive", action="store_true",
                        help="Enter custom resume and JD interactively")
    args = parser.parse_args()

    if args.interactive:
        interactive_mode()
    else:
        print("Running built-in demo...")
        result = match(DEMO_RESUME, DEMO_JD)
        print_report(result)
        with open("match_result.json", "w") as f:
            json.dump(result, f, indent=2)
        print("Full JSON saved → match_result.json")
