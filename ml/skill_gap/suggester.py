"""
suggester.py
============
Converts gap_detector output into human-readable, actionable suggestions.
Groups them by priority: Critical → Important → Nice to Have.

Usage:
    from suggester import generate_suggestions
    suggestions = generate_suggestions(gap_report)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from gap_detector import detect_gaps


# ─────────────────────────────────────────────────────────────────
# SKILL → SUGGESTION TEMPLATES
# ─────────────────────────────────────────────────────────────────

SKILL_SUGGESTIONS = {
    # Languages
    "python":        "Learn Python — it's the #1 language for software/ML roles. Start with basic scripting and OOP.",
    "javascript":    "Add JavaScript to your stack. It's essential for web development (frontend and backend).",
    "typescript":    "Learn TypeScript — it's increasingly required for professional React/Node.js projects.",
    "java":          "Add Java to your skills, especially for backend/enterprise roles.",
    "c++":           "Study C++ for roles requiring systems programming or competitive programming.",

    # Frontend
    "react":         "Build a React project. Create a portfolio/dashboard app and put it on GitHub.",
    "html":          "Add basic HTML to your skills section — it's expected for any web role.",
    "css":           "Include CSS/Tailwind in your skills. Style one of your projects properly.",
    "tailwind":      "Learn Tailwind CSS — it speeds up UI development and is widely used in modern projects.",
    "vue":           "Consider Vue.js as an alternative to React for frontend projects.",

    # Backend
    "node.js":       "Build a Node.js + Express REST API project. It shows full-stack capability.",
    "rest api":      "Create or document a REST API project. Include it in your experience/projects.",
    "express":       "Use Express.js to build your backend project. Pair it with MongoDB or PostgreSQL.",
    "django":        "Try Django for Python web development — great for rapid prototyping.",
    "flask":         "Build a simple Flask API to demonstrate your Python backend skills.",
    "graphql":       "Add GraphQL to your Node.js or Python project for modern API design.",

    # Databases
    "sql":           "Practice SQL queries on LeetCode or HackerRank. Add MySQL or PostgreSQL to a project.",
    "mongodb":       "Use MongoDB in a MERN stack project. Show schema design and aggregation.",
    "postgresql":    "Switch from SQLite to PostgreSQL in one project — it's production-grade.",
    "redis":         "Add Redis for caching in one project. It's a great talking point in interviews.",
    "mysql":         "Use MySQL as your project database. It's widely used in industry.",

    # Cloud/DevOps
    "git":           "Use Git for ALL your projects. Show active GitHub commits and project history.",
    "github":        "Put all your projects on GitHub with proper README files and commit history.",
    "docker":        "Dockerize one of your projects. Add a Dockerfile + docker-compose.yml.",
    "aws":           "Get AWS Free Tier account. Deploy one project on EC2 or use S3 for storage.",
    "ci/cd":         "Set up GitHub Actions CI/CD for one project. Auto-run tests on every push.",
    "kubernetes":    "Learn Kubernetes basics. Even a local Minikube setup shows DevOps awareness.",
    "linux":         "Practice Linux commands. Use WSL (Windows) or a Linux VM for development.",

    # ML/AI
    "machine learning": "Complete a Kaggle competition or build an ML project (classification, regression).",
    "deep learning":    "Build a neural network project using TensorFlow or PyTorch.",
    "pandas":           "Use pandas for data cleaning in a data science or ML project.",
    "numpy":            "Use NumPy for numerical operations. It's fundamental for any ML/DS role.",
    "scikit-learn":     "Build an end-to-end ML pipeline using scikit-learn. Publish it on GitHub.",
    "tensorflow":       "Implement a CNN or NLP model using TensorFlow/Keras.",
    "pytorch":          "Build a model in PyTorch — preferred in research and ML engineering roles.",

    # Tools
    "agile":         "Mention Agile/Scrum in your experience. If you worked in a team, you likely used it.",
    "jira":          "Add Jira or any project tracking tool you've used in team projects.",
    "postman":       "Use Postman to test and document your REST APIs. Mention it in tools.",
    "unit testing":  "Write unit tests for one project using pytest (Python) or Jest (JS).",
    "swagger":       "Document your API using Swagger/OpenAPI. Shows professional engineering habits.",

    # General
    "data structures": "Practice Data Structures on LeetCode. Mention it under Skills.",
    "algorithms":      "Add Algorithms to your skills. Prepare array, tree, graph problems for interviews.",
    "oop":             "Demonstrate OOP principles in your projects. Use classes, inheritance, encapsulation.",
    "authentication":  "Add JWT authentication to one of your projects. It's a common interview topic.",
    "microservices":   "Mention microservices architecture if you've built multiple backend services.",
}

# ─────────────────────────────────────────────────────────────────
# SECTION SUGGESTIONS
# ─────────────────────────────────────────────────────────────────

SECTION_SUGGESTIONS = {
    "projects":       "Add a Projects section with 2–3 projects. Include tech stack, your role, and a GitHub link.",
    "skills":         "Add a dedicated Skills section. Group by: Languages, Frameworks, Databases, Tools.",
    "experience":     "Add an Experience/Internship section. Even college projects or freelance work counts.",
    "certifications": "Add relevant certifications (AWS, Google, Coursera, HackerRank). They add credibility.",
    "summary":        "Add a 2-line professional summary at the top. e.g. 'Final-year CS student passionate about...'",
    "achievements":   "List academic/competitive achievements: hackathons, coding contests, dean's list, etc.",
}

# ─────────────────────────────────────────────────────────────────
# PRIORITY RULES
# ─────────────────────────────────────────────────────────────────

CRITICAL_SKILLS = {"git", "python", "javascript", "sql", "rest api", "react", "node.js"}
CRITICAL_SECTIONS = {"skills", "education", "projects", "experience"}


# ─────────────────────────────────────────────────────────────────
# MAIN: GENERATE SUGGESTIONS
# ─────────────────────────────────────────────────────────────────

def generate_suggestions(gap_report: dict) -> dict:
    """
    Converts a gap_detector report into prioritised, human-friendly suggestions.

    Returns:
    {
      ats_score, grade,
      critical:   [ {type, message, action} ],
      important:  [ {type, message, action} ],
      nice_to_have: [ {type, message, action} ],
      score_breakdown: {...},
      summary_message: str
    }
    """
    critical     = []
    important    = []
    nice_to_have = []

    # ── Missing skills ────────────────────────────────────────────
    for skill in gap_report.get("missing_skills", []):
        suggestion_text = SKILL_SUGGESTIONS.get(skill, f"Add '{skill}' to your skills and include it in a project.")
        item = {
            "type":    "skill",
            "skill":   skill,
            "message": f"Missing: {skill}",
            "action":  suggestion_text,
        }
        if skill in CRITICAL_SKILLS:
            critical.append(item)
        else:
            important.append(item)

    # ── Role-specific gaps ─────────────────────────────────────────
    for skill in gap_report.get("role_gaps", {}).get("missing", []):
        if any(s["skill"] == skill for s in critical + important):
            continue  # already added
        suggestion_text = SKILL_SUGGESTIONS.get(skill, f"Add '{skill}' — it's required for {gap_report.get('target_role', 'this role')}.")
        critical.append({
            "type":    "role_skill",
            "skill":   skill,
            "message": f"Required for {gap_report.get('target_role', 'this role')}: {skill}",
            "action":  suggestion_text,
        })

    # ── Missing sections ──────────────────────────────────────────
    sections = gap_report.get("features", {}).get("sections", {})
    for section, present in sections.items():
        if not present and section in SECTION_SUGGESTIONS:
            item = {
                "type":    "section",
                "section": section,
                "message": f"Missing section: {section.title()}",
                "action":  SECTION_SUGGESTIONS[section],
            }
            if section in CRITICAL_SECTIONS:
                critical.append(item)
            else:
                nice_to_have.append(item)

    # ── Quality flags → important suggestions ────────────────────
    for flag in gap_report.get("quality_flags", []):
        important.append({
            "type":    "quality",
            "message": flag,
            "action":  flag,
        })

    # ── Formatting issues ─────────────────────────────────────────
    rules_issues = gap_report.get("components", {}).get("rules", {}).get("issues", [])
    format_issues = gap_report.get("components", {}).get("formatting", {}).get("issues", [])
    for issue in rules_issues + format_issues:
        nice_to_have.append({
            "type":    "formatting",
            "message": issue,
            "action":  issue,
        })

    # ── Deduplicate ───────────────────────────────────────────────
    critical     = _deduplicate(critical)
    important    = _deduplicate(important)
    nice_to_have = _deduplicate(nice_to_have)

    # ── Score breakdown ───────────────────────────────────────────
    comp = gap_report.get("components", {})
    score_breakdown = {
        "total":        gap_report["ats_score"],
        "max":          100,
        "rules":        f"{comp.get('rules', {}).get('raw', 0)}/40",
        "similarity":   f"{comp.get('similarity', {}).get('raw', 0)}/30",
        "skill_coverage": f"{comp.get('skill_coverage', {}).get('raw', 0)}/20",
        "formatting":   f"{comp.get('formatting', {}).get('raw', 0)}/10",
    }

    # ── Summary message ───────────────────────────────────────────
    summary = _build_summary(gap_report, len(critical), len(important))

    return {
        "ats_score":       gap_report["ats_score"],
        "grade":           gap_report["grade"],
        "target_role":     gap_report.get("target_role", ""),
        "critical":        critical[:8],
        "important":       important[:8],
        "nice_to_have":    nice_to_have[:6],
        "score_breakdown": score_breakdown,
        "matched_skills":  gap_report.get("matched_skills", []),
        "summary_message": summary,
        "category_coverage": gap_report.get("category_coverage", {}),
    }


def _deduplicate(items: list) -> list:
    seen = set()
    out = []
    for item in items:
        key = item.get("skill") or item.get("section") or item.get("message", "")[:40]
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def _build_summary(report: dict, n_critical: int, n_important: int) -> str:
    score = report["ats_score"]
    grade = report["grade"]
    role  = report.get("target_role", "Software Engineer").replace("_", " ").title()
    matched = len(report.get("matched_skills", []))

    if score >= 80:
        return (f"Strong resume! You match {matched} key software skills. "
                f"A few refinements can push you above 85+.")
    elif score >= 65:
        return (f"Good resume for {role} roles. You have {matched} matching skills. "
                f"Address the {n_critical} critical gaps to significantly boost your score.")
    elif score >= 50:
        return (f"Your resume has potential. You match {matched} skills, but there are "
                f"{n_critical} critical and {n_important} important gaps to address.")
    else:
        return (f"Your resume needs work for {role} roles. Start with the {n_critical} critical "
                f"fixes — they'll have the biggest impact on your ATS score.")


# ─────────────────────────────────────────────────────────────────
# CONVENIENCE FUNCTION: run everything in one call
# ─────────────────────────────────────────────────────────────────

def analyze_resume(resume_text: str, target_role: str = "software_engineer") -> dict:
    """
    One-call function: runs gap detection + suggestion generation.
    This is what the Node.js server calls via Python bridge.

    Returns the full suggestions report.
    """
    gap_report  = detect_gaps(resume_text, target_role)
    suggestions = generate_suggestions(gap_report)
    return suggestions


# ─────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json, argparse

    parser = argparse.ArgumentParser(description="Resume Skill Gap Suggester")
    parser.add_argument("--resume", type=str, help="Path to .txt resume file")
    parser.add_argument("--role",   type=str, default="software_engineer")
    args = parser.parse_args()

    if args.resume:
        with open(args.resume) as f:
            text = f.read()
    else:
        text = """
        Aman | aman@example.com | +91-9876543210
        Skills: Python, React, SQL, Git, REST API
        Education: B.Tech CS, 2024
        Experience:
          - Developed a REST API using Node.js
        Projects:
          - Resume Analyzer: React + Flask app
        """

    result = analyze_resume(text, target_role=args.role)

    print(f"\n{'='*60}")
    print(f"  ATS SCORE: {result['ats_score']}/100  ({result['grade']})")
    print(f"  {result['summary_message']}")
    print(f"  Score: {result['score_breakdown']}")
    print(f"{'='*60}")

    for priority, label in [("critical", "🔴 CRITICAL"), ("important", "🟡 IMPORTANT"), ("nice_to_have", "🟢 NICE TO HAVE")]:
        items = result[priority]
        if items:
            print(f"\n{label} ({len(items)}):")
            for item in items:
                print(f"  • {item['message']}")
                print(f"    → {item['action']}")
