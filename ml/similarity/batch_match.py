"""
batch_match.py
==============
Process multiple resume→JD pairs from JSON and export a ranked CSV.

Input file:  candidates.json
Output file: results.csv

Run:
    python batch_match.py
"""

import json
import csv
from matcher import match

INPUT_FILE  = "candidates.json"
OUTPUT_FILE = "results.csv"

SAMPLE_DATA = [
    {
        "name": "Alice Singh",
        "resume": """
            Python developer with 4 years experience. Skilled in Django, REST APIs,
            PostgreSQL, Docker, AWS, Git. Some exposure to machine learning with
            Scikit-learn. Worked in Agile teams. Strong communication skills.
        """,
        "jd": """
            Backend Python Engineer. Must have Django/Flask, REST API design,
            PostgreSQL or MySQL, Docker, AWS, CI/CD, Git. Machine learning
            knowledge a plus. Agile methodology.
        """,
    },
    {
        "name": "Rahul Sharma",
        "resume": """
            Data Scientist. Python, R, Pandas, NumPy, Scikit-learn, TensorFlow.
            Experience with NLP and computer vision projects.
            Tableau, Power BI for visualization. SQL basics.
        """,
        "jd": """
            Senior ML Engineer. Requirements: Python, TensorFlow, PyTorch,
            NLP, MLOps, Docker, Kubernetes, AWS, SQL, REST APIs, CI/CD.
        """,
    },
    {
        "name": "Priya Mehta",
        "resume": """
            Full-stack developer. JavaScript, TypeScript, React, Node.js,
            Express, MongoDB, PostgreSQL, Docker, AWS, GraphQL, REST APIs.
            5 years experience. Led teams of 4 engineers.
        """,
        "jd": """
            Full-Stack JavaScript Engineer. React, Node.js, TypeScript, REST APIs,
            GraphQL, PostgreSQL or MongoDB, Docker, AWS or GCP, CI/CD pipelines.
        """,
    },
]


def run_batch(candidates: list[dict]) -> list[dict]:
    rows = []
    for c in candidates:
        r = match(c["resume"], c["jd"])
        rows.append({
            "Name":           c["name"],
            "Score (%)":      r["match_score"]["percentage"],
            "Grade":          r["match_score"]["grade"],
            "Matched Skills": ", ".join(r["matched_skills"]),
            "Missing Skills": ", ".join(r["missing_skills"]),
            "Recommendation": r["recommendation"],
        })
    rows.sort(key=lambda x: x["Score (%)"], reverse=True)
    return rows


def save_csv(rows: list[dict], path: str) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    # load from file if it exists, else use sample
    try:
        with open(INPUT_FILE) as f:
            candidates = json.load(f)
        print(f"Loaded {len(candidates)} candidates from {INPUT_FILE}")
    except FileNotFoundError:
        print(f"{INPUT_FILE} not found — using built-in sample data.")
        candidates = SAMPLE_DATA

    rows = run_batch(candidates)

    print(f"\n{'─'*60}")
    print(f"  BATCH RESULTS  (sorted by score)")
    print(f"{'─'*60}")
    for r in rows:
        print(f"  {r['Name']:<18} {r['Score (%)']:>6}%  {r['Grade']}")
    print(f"{'─'*60}\n")

    save_csv(rows, OUTPUT_FILE)
    print(f"CSV saved → {OUTPUT_FILE}")
