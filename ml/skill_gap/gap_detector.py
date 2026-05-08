"""
gap_detector.py
===============
Compares a resume's extracted skills against:
  1. The software resume knowledge base (367 resumes)
  2. Role-specific required skills from skill_taxonomy.py
  3. Common software resume patterns

Returns a structured gap report with missing skills, weak areas,
and a composite ATS score.

Usage:
    from gap_detector import detect_gaps
    report = detect_gaps(resume_text, target_role="software_engineer")
"""

import re
import sys
import os
import json

# ── Path fix so this runs standalone or imported ──────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

from skill_taxonomy import (
    SKILL_TAXONOMY,
    CORE_SOFTWARE_SKILLS,
    ROLE_REQUIRED_SKILLS,
    TECH_SKILL_LIST,
)
from extractor import extract_features


# ─────────────────────────────────────────────────────────────────
# KNOWLEDGE BASE PATTERNS
# (Derived from the 367-resume corpus — top skills that appear in
#  well-structured software resumes from similar backgrounds)
# ─────────────────────────────────────────────────────────────────

KB_COMMON_SKILLS = [
    "python", "javascript", "react", "node.js", "sql", "git",
    "rest api", "html", "css", "mongodb", "docker", "aws",
    "typescript", "java", "spring", "mysql", "postgresql",
    "data structures", "algorithms", "github", "express",
    "machine learning", "deep learning", "flask", "django",
    "pandas", "numpy", "linux", "agile", "scrum",
]

KB_SECTION_COVERAGE = {
    "education":      0.98,   # 98% of resumes have this
    "skills":         0.95,
    "projects":       0.89,
    "experience":     0.76,
    "contact":        0.99,
    "certifications": 0.42,
    "summary":        0.31,
    "achievements":   0.28,
}

KB_QUALITY_BENCHMARKS = {
    "min_word_count":       300,
    "good_word_count":      500,
    "min_bullets":          5,
    "good_bullets":         10,
    "min_action_verbs":     3,
    "good_action_verbs":    6,
    "min_quantified":       1,
    "good_quantified":      3,
    "min_skills":           6,
    "good_skills":          12,
}


# ─────────────────────────────────────────────────────────────────
# SKILL MATCHING
# ─────────────────────────────────────────────────────────────────

def _match_skills(resume_lower: str, skill_list: list) -> tuple:
    """
    Returns (matched, missing) from skill_list.
    Handles multi-word skills (e.g. 'machine learning', 'rest api').
    """
    matched = []
    missing = []
    for skill in skill_list:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, resume_lower):
            matched.append(skill)
        else:
            missing.append(skill)
    return matched, missing


def _category_coverage(resume_lower: str) -> dict:
    """Check what % of each skill category is covered."""
    coverage = {}
    for cat, data in SKILL_TAXONOMY.items():
        if cat == "soft_skills":
            continue
        matched, _ = _match_skills(resume_lower, data["skills"])
        pct = round(len(matched) / max(len(data["skills"]), 1) * 100, 1)
        coverage[cat] = {
            "label":   data["label"],
            "matched": matched,
            "total":   len(data["skills"]),
            "percent": pct,
        }
    return coverage


# ─────────────────────────────────────────────────────────────────
# ATS SCORE COMPONENTS
# ─────────────────────────────────────────────────────────────────

def _ats_rules_score(features: dict) -> dict:
    """40% of total score — rule-based checks."""
    score = 0
    details = []

    # Contact info (8 pts)
    if features["has_email"]:
        score += 4
    else:
        details.append("Add email address")
    if features["has_phone"]:
        score += 4
    else:
        details.append("Add phone number")

    # Required sections (20 pts — 4 pts each: skills, education, experience, projects, contact)
    sections = features["sections"]
    for section, pts in [("skills", 5), ("education", 5), ("experience", 4),
                          ("projects", 4), ("contact", 2)]:
        if sections.get(section):
            score += pts
        else:
            details.append(f"Add {section.title()} section")

    # Bullet points (6 pts)
    bullets = features["bullet_count"]
    if bullets >= 10:
        score += 6
    elif bullets >= 5:
        score += 3
        details.append("Add more bullet points (aim for 10+)")
    else:
        details.append(f"Very few bullet points found ({bullets}). Use bullet points for experience/projects")

    # Word count (6 pts)
    wc = features["word_count"]
    if wc >= 500:
        score += 6
    elif wc >= 300:
        score += 3
        details.append("Resume is a bit short — aim for 300–600 words")
    else:
        details.append(f"Resume too short ({wc} words). Add more details")

    return {"raw": score, "max": 40, "issues": details}


def _similarity_score(matched_kb: list, missing_kb: list) -> dict:
    """30% of total — how similar to top software resumes from KB."""
    total = len(matched_kb) + len(missing_kb)
    if total == 0:
        return {"raw": 0, "max": 30, "matched": [], "missing": []}
    pct = len(matched_kb) / total
    score = round(pct * 30)
    return {
        "raw":     score,
        "max":     30,
        "matched": matched_kb,
        "missing": missing_kb[:10],
    }


def _skill_coverage_score(matched_role: list, missing_role: list) -> dict:
    """20% of total — role-specific skill coverage."""
    total = len(matched_role) + len(missing_role)
    if total == 0:
        return {"raw": 0, "max": 20, "matched": [], "missing": []}
    pct = len(matched_role) / total
    score = round(pct * 20)
    return {
        "raw":     score,
        "max":     20,
        "matched": matched_role,
        "missing": missing_role,
    }


def _formatting_score(features: dict) -> dict:
    """10% of total — formatting quality."""
    score = 0
    details = []

    if features["has_github"]:
        score += 3
    else:
        details.append("Add GitHub profile URL")

    if features["has_linkedin"]:
        score += 2

    verbs = len(features["action_verbs"])
    if verbs >= 6:
        score += 3
    elif verbs >= 3:
        score += 1
        details.append(f"Use more strong action verbs (found {verbs}, aim for 6+)")
    else:
        details.append("Use strong action verbs: developed, built, implemented, deployed, optimized")

    if features["quantified_count"] >= 3:
        score += 2
    elif features["quantified_count"] >= 1:
        score += 1
        details.append("Add more measurable results (e.g. 'reduced load time by 30%')")
    else:
        details.append("Quantify your achievements with numbers/percentages")

    if features.get("weak_verbs"):
        details.append(f"Replace weak verbs ({', '.join(features['weak_verbs'][:3])}) with action verbs")

    return {"raw": score, "max": 10, "issues": details}


# ─────────────────────────────────────────────────────────────────
# MAIN: DETECT GAPS
# ─────────────────────────────────────────────────────────────────

def detect_gaps(resume_text: str, target_role: str = "software_engineer") -> dict:
    """
    Full gap detection pipeline.

    Args:
        resume_text: raw resume string
        target_role: one of ROLE_REQUIRED_SKILLS keys

    Returns:
        {
          ats_score, grade,
          components: { rules, similarity, skill_coverage, formatting },
          missing_skills, matched_skills,
          category_coverage,
          role_gaps,
          quality_flags,
          features (raw extracted features)
        }
    """
    lower = resume_text.lower()
    features = extract_features(resume_text)

    # ── KB similarity ──────────────────────────────────────────────
    kb_matched, kb_missing = _match_skills(lower, KB_COMMON_SKILLS)

    # ── Role-specific gaps ─────────────────────────────────────────
    role_skills = ROLE_REQUIRED_SKILLS.get(
        target_role.lower().replace(" ", "_"),
        ROLE_REQUIRED_SKILLS["software_engineer"]
    )
    role_matched, role_missing = _match_skills(lower, role_skills)

    # ── Score components ───────────────────────────────────────────
    rules_comp    = _ats_rules_score(features)
    sim_comp      = _similarity_score(kb_matched, kb_missing)
    skill_comp    = _skill_coverage_score(role_matched, role_missing)
    format_comp   = _formatting_score(features)

    total_score = (
        rules_comp["raw"] +
        sim_comp["raw"] +
        skill_comp["raw"] +
        format_comp["raw"]
    )
    total_score = min(100, total_score)

    # ── Category coverage ──────────────────────────────────────────
    cat_coverage = _category_coverage(lower)

    # ── Quality flags ──────────────────────────────────────────────
    quality_flags = _quality_flags(features)

    return {
        "ats_score":   total_score,
        "grade":       _grade(total_score),
        "target_role": target_role,

        "components": {
            "rules":          rules_comp,
            "similarity":     sim_comp,
            "skill_coverage": skill_comp,
            "formatting":     format_comp,
        },

        "matched_skills":    kb_matched,
        "missing_skills":    kb_missing[:15],

        "role_gaps": {
            "role":   target_role,
            "matched": role_matched,
            "missing": role_missing,
        },

        "category_coverage": cat_coverage,
        "quality_flags":     quality_flags,
        "features":          features,
    }


def _grade(score: int) -> str:
    if score >= 80: return "Excellent"
    if score >= 65: return "Good"
    if score >= 50: return "Fair"
    if score >= 35: return "Needs Improvement"
    return "Poor"


def _quality_flags(features: dict) -> list:
    """Human-readable quality warnings."""
    flags = []
    b = KB_QUALITY_BENCHMARKS

    if features["word_count"] < b["min_word_count"]:
        flags.append(f"Resume is short ({features['word_count']} words). Aim for {b['good_word_count']}+")
    if features["bullet_count"] < b["min_bullets"]:
        flags.append("Not enough bullet points. Structure experience/projects with bullets.")
    if len(features["action_verbs"]) < b["min_action_verbs"]:
        flags.append("Few action verbs. Start bullets with: built, developed, implemented, designed.")
    if features["quantified_count"] < b["min_quantified"]:
        flags.append("No quantified achievements. Add numbers: '40% faster', '10,000 users', '$5K saved'.")
    if not features["has_github"]:
        flags.append("GitHub profile missing. Add github.com/yourusername.")
    if not features["has_linkedin"]:
        flags.append("LinkedIn URL missing.")
    if not features["sections"].get("projects"):
        flags.append("No Projects section found. Add 2-3 software projects.")
    if not features["sections"].get("skills"):
        flags.append("No Skills section found. Add a dedicated Skills section.")

    return flags


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Resume Skill Gap Detector")
    parser.add_argument("--resume", type=str, help="Path to resume .txt file")
    parser.add_argument("--role",   type=str, default="software_engineer",
                        help="Target role: software_engineer | frontend_developer | backend_developer | fullstack_developer | data_scientist | ml_engineer | devops_engineer")
    args = parser.parse_args()

    if args.resume:
        with open(args.resume) as f:
            text = f.read()
    else:
        text = """
        Aman | aman@example.com | github.com/aman | +91-9876543210
        Skills: Python, React, Node.js, SQL, Git, REST API, Docker, MongoDB
        Education: B.Tech CS, 2024
        Experience:
          - Developed a REST API using Node.js reducing response time by 40%
          - Built a React dashboard for data visualization
        Projects:
          - Resume Analyzer: Full-stack app using React + Flask
          - Chat App: Real-time messaging using WebSocket
        """

    result = detect_gaps(text, target_role=args.role)

    print(f"\n{'='*55}")
    print(f"  ATS SCORE: {result['ats_score']}/100  →  {result['grade']}")
    print(f"  Role: {result['target_role']}")
    print(f"{'='*55}")

    c = result["components"]
    print(f"\n  Score Breakdown:")
    print(f"    Rules (40%)     : {c['rules']['raw']}/40")
    print(f"    Similarity (30%): {c['similarity']['raw']}/30")
    print(f"    Skills (20%)    : {c['skill_coverage']['raw']}/20")
    print(f"    Formatting (10%): {c['formatting']['raw']}/10")

    print(f"\n  ✅ Matched KB Skills ({len(result['matched_skills'])}):")
    print(f"    {', '.join(result['matched_skills'])}")

    print(f"\n  ❌ Missing Skills ({len(result['missing_skills'])}):")
    print(f"    {', '.join(result['missing_skills'])}")

    print(f"\n  ⚠️  Role Gaps ({result['role_gaps']['role']}):")
    print(f"    {', '.join(result['role_gaps']['missing']) or 'None!'}")

    if result["quality_flags"]:
        print(f"\n  🚩 Quality Flags:")
        for flag in result["quality_flags"]:
            print(f"    • {flag}")

    print()
