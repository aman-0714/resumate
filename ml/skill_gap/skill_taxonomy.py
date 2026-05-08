"""
skill_taxonomy.py
=================
Master list of software engineering skills organised by category.
Used by gap_detector.py to identify what a resume is missing.
"""

# ─────────────────────────────────────────────────────────────────
# SKILL TAXONOMY
# ─────────────────────────────────────────────────────────────────

SKILL_TAXONOMY = {

    "languages": {
        "label": "Programming Languages",
        "skills": [
            "python", "javascript", "typescript", "java", "c", "c++", "c#",
            "go", "rust", "kotlin", "swift", "php", "ruby", "scala", "dart",
            "r", "matlab", "bash", "shell", "perl",
        ],
        "weight": 1.5,
    },

    "frontend": {
        "label": "Frontend / UI",
        "skills": [
            "react", "angular", "vue", "next.js", "nuxt", "svelte",
            "html", "css", "tailwind", "bootstrap", "sass", "scss",
            "redux", "zustand", "webpack", "vite", "figma",
        ],
        "weight": 1.2,
    },

    "backend": {
        "label": "Backend / APIs",
        "skills": [
            "node.js", "express", "fastapi", "flask", "django", "spring",
            "rest api", "graphql", "grpc", "microservices", "websocket",
            "oauth", "jwt", "nginx", "apache",
        ],
        "weight": 1.3,
    },

    "databases": {
        "label": "Databases",
        "skills": [
            "sql", "mysql", "postgresql", "mongodb", "redis", "sqlite",
            "firebase", "cassandra", "elasticsearch", "dynamodb",
            "nosql", "orm", "prisma", "mongoose",
        ],
        "weight": 1.2,
    },

    "cloud_devops": {
        "label": "Cloud & DevOps",
        "skills": [
            "aws", "gcp", "azure", "docker", "kubernetes", "terraform",
            "ci/cd", "github actions", "jenkins", "ansible", "linux",
            "nginx", "serverless", "lambda", "ec2", "s3",
        ],
        "weight": 1.3,
    },

    "ml_ai": {
        "label": "ML / AI",
        "skills": [
            "machine learning", "deep learning", "nlp", "computer vision",
            "tensorflow", "pytorch", "scikit-learn", "keras", "pandas",
            "numpy", "matplotlib", "data analysis", "feature engineering",
            "model deployment", "llm", "transformers", "langchain",
        ],
        "weight": 1.4,
    },

    "tools_practices": {
        "label": "Tools & Practices",
        "skills": [
            "git", "github", "agile", "scrum", "jira", "postman",
            "unit testing", "jest", "pytest", "selenium", "swagger",
            "linux", "vs code", "intellij", "debugging",
        ],
        "weight": 1.0,
    },

    "soft_skills": {
        "label": "Soft Skills & Practices",
        "skills": [
            "communication", "teamwork", "problem solving", "leadership",
            "time management", "critical thinking", "collaboration",
        ],
        "weight": 0.6,
    },
}

# ── Flat list of all tech skills (no soft skills) for gap detection ───────────
TECH_SKILL_LIST = []
for cat, data in SKILL_TAXONOMY.items():
    if cat != "soft_skills":
        TECH_SKILL_LIST.extend(data["skills"])

# ── Most in-demand skills for Software Engineer roles ─────────────────────────
CORE_SOFTWARE_SKILLS = [
    "python", "javascript", "react", "node.js", "sql", "git",
    "rest api", "docker", "aws", "html", "css",
]

# ── Role-specific required skills ─────────────────────────────────────────────
ROLE_REQUIRED_SKILLS = {
    "software_engineer": [
        "python", "javascript", "git", "sql", "rest api",
        "data structures", "algorithms", "oop",
    ],
    "frontend_developer": [
        "react", "javascript", "typescript", "html", "css",
        "tailwind", "git", "rest api",
    ],
    "backend_developer": [
        "python", "node.js", "sql", "rest api", "docker",
        "git", "authentication", "database",
    ],
    "fullstack_developer": [
        "react", "node.js", "javascript", "sql", "mongodb",
        "rest api", "git", "docker",
    ],
    "data_scientist": [
        "python", "machine learning", "pandas", "numpy",
        "sql", "data analysis", "scikit-learn", "git",
    ],
    "ml_engineer": [
        "python", "tensorflow", "pytorch", "machine learning",
        "deep learning", "docker", "aws", "git", "sql",
    ],
    "devops_engineer": [
        "docker", "kubernetes", "aws", "ci/cd", "linux",
        "terraform", "git", "bash",
    ],
}
