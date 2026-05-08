"""
extractor.py
============
Extracts structured features from raw resume text.

Usage:
    from extractor import extract_features
    features = extract_features(resume_text)
"""

import re
from collections import Counter


# ─────────────────────────────────────────────────────────────────
# ACTION VERBS
# ─────────────────────────────────────────────────────────────────

STRONG_ACTION_VERBS = [
    "developed", "built", "designed", "implemented", "architected",
    "engineered", "deployed", "automated", "optimized", "scaled",
    "led", "managed", "launched", "created", "integrated",
    "reduced", "increased", "improved", "delivered", "shipped",
    "collaborated", "mentored", "contributed", "resolved", "migrated",
    "refactored", "tested", "analyzed", "researched", "presented",
]

WEAK_VERBS = [
    "worked", "helped", "assisted", "did", "made", "used",
    "responsible for", "involved in", "participated in",
]

# ─────────────────────────────────────────────────────────────────
# SECTION HEADERS TO DETECT
# ─────────────────────────────────────────────────────────────────

SECTION_PATTERNS = {
    "education":       r'\b(education|academic|qualification|degree|university|college)\b',
    "experience":      r'\b(experience|work history|employment|internship|intern|job)\b',
    "skills":          r'\b(skills|technical skills|technologies|tech stack|competencies|expertise)\b',
    "projects":        r'\b(projects|personal projects|academic projects|portfolio|work)\b',
    "certifications":  r'\b(certif|certification|certified|credential|course|training)\b',
    "summary":         r'\b(summary|objective|profile|about me|overview)\b',
    "achievements":    r'\b(achievement|award|honor|recognition|accomplishment)\b',
    "contact":         r'\b(contact|phone|email|linkedin|github|portfolio)\b',
}

# ─────────────────────────────────────────────────────────────────
# QUANTIFICATION PATTERNS
# ─────────────────────────────────────────────────────────────────

QUANTIFY_PATTERNS = [
    r'\d+\s*%',                      # percentages: 30%, 50%
    r'\d+\s*(x|times|fold)',         # multipliers: 3x, 2 times
    r'\$\s*\d+',                     # dollar amounts
    r'\d+\s*(users|customers|clients|requests|transactions)',
    r'\d+\s*(ms|milliseconds|seconds|hours)',
    r'(increased|reduced|improved|optimized|boosted|cut)\s.*\d+',
]


# ─────────────────────────────────────────────────────────────────
# MAIN EXTRACTOR
# ─────────────────────────────────────────────────────────────────

def extract_features(text: str) -> dict:
    """
    Full feature extraction from resume text.
    Returns a structured dict with all detected features.
    """
    lower = text.lower()

    return {
        "word_count":          _word_count(text),
        "bullet_count":        _count_bullets(text),
        "sections":            _detect_sections(lower),
        "skills_raw":          _extract_raw_skills(lower),
        "action_verbs":        _extract_action_verbs(lower),
        "weak_verbs":          _detect_weak_verbs(lower),
        "quantified_count":    _count_quantified(text),
        "has_email":           bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)),
        "has_phone":           bool(re.search(r'[6-9]\d{9}|\+91[\s-]?\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4}', text)),
        "has_linkedin":        bool(re.search(r'linkedin\.com', lower)),
        "has_github":          bool(re.search(r'github\.com', lower)),
        "has_url":             bool(re.search(r'https?://', lower)),
        "avg_bullet_length":   _avg_bullet_length(text),
        "tech_keyword_density": _tech_density(lower),
    }


# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────

def _word_count(text: str) -> int:
    return len(text.split())


def _count_bullets(text: str) -> int:
    """Count lines that start with bullet-like characters or dashes."""
    bullets = re.findall(r'^\s*[•\-\*\u2022\u25cf\u2013>]\s+', text, re.MULTILINE)
    return len(bullets)


def _detect_sections(lower: str) -> dict:
    """Return dict of section_name → True/False."""
    return {
        section: bool(re.search(pattern, lower))
        for section, pattern in SECTION_PATTERNS.items()
    }


def _extract_raw_skills(lower: str) -> list:
    """
    Simple skill extraction — tokenise and return meaningful tech tokens.
    No taxonomy filtering here; that happens in gap_detector.py.
    """
    tokens = re.findall(r'[a-z][a-z0-9\+\#\.\-/]*', lower)
    # Remove common stop words
    stop = {'and','or','the','a','an','in','on','at','to','for','of','with',
            'is','are','was','were','be','have','has','had','do','does','i',
            'you','it','we','they','my','your','our','their','etc','also',
            'used','using','use','work','worked','experience','team','good'}
    filtered = [t for t in tokens if t not in stop and len(t) > 1]
    # Deduplicate preserving order
    seen = set()
    unique = []
    for t in filtered:
        if t not in seen:
            seen.add(t)
            unique.append(t)
    return unique[:80]


def _extract_action_verbs(lower: str) -> list:
    found = [v for v in STRONG_ACTION_VERBS if re.search(r'\b' + v + r'\b', lower)]
    return found


def _detect_weak_verbs(lower: str) -> list:
    found = [v for v in WEAK_VERBS if v in lower]
    return found


def _count_quantified(text: str) -> int:
    """Count how many bullet points / lines have measurable numbers."""
    count = 0
    for pattern in QUANTIFY_PATTERNS:
        count += len(re.findall(pattern, text, re.IGNORECASE))
    return count


def _avg_bullet_length(text: str) -> float:
    """Average word count of bullet lines."""
    lines = re.findall(r'^\s*[•\-\*\u2022\u25cf\u2013>]\s+(.+)$', text, re.MULTILINE)
    if not lines:
        return 0.0
    lengths = [len(l.split()) for l in lines]
    return round(sum(lengths) / len(lengths), 1)


def _tech_density(lower: str) -> float:
    """Ratio of tech-related tokens vs total words (rough measure)."""
    from skill_taxonomy import TECH_SKILL_LIST
    words = set(lower.split())
    tech_hits = sum(1 for skill in TECH_SKILL_LIST if skill in lower)
    total_words = max(len(words), 1)
    return round(tech_hits / total_words, 3)


# ─────────────────────────────────────────────────────────────────
# CLI TEST
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    sample = """
    Aman Kaur | aman@example.com | github.com/aman | +91-9876543210
    
    SKILLS
    Python, React, Node.js, MongoDB, SQL, Git, REST API, Docker
    
    EDUCATION
    B.Tech Computer Science, Punjab Technical University, 2024
    
    EXPERIENCE
    Software Intern — TechCorp (June 2023 – Aug 2023)
    • Developed a REST API using Node.js and Express
    • Reduced API response time by 40% through query optimization
    • Collaborated with 5-member team using Git and Agile methodology
    
    PROJECTS
    Resume Analyzer — Built a full-stack app using React and Flask
    Chat App — Implemented real-time messaging using WebSocket and Node.js
    """
    features = extract_features(sample)
    print(json.dumps(features, indent=2))
