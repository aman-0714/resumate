"""
Batch Resume Scorer
====================
Runs ML inference on ALL resumes in paytm_resume/ and optum_resume/
and outputs a ranked CSV + JSON report.

Usage:
    python batch_score.py
    python batch_score.py --data_dir .. --out_dir results
"""

import os
import re
import json
import argparse
import pickle
import csv
from pathlib import Path
from collections import Counter

# Import from train_model
from train_model import extract_pdf_text, preprocess_text, predict


def score_all(data_dir: str, models_dir: str, out_dir: str):
    """Score every resume and write results/ranked_resumes.csv."""
    os.makedirs(out_dir, exist_ok=True)

    data_path = Path(data_dir)
    results   = []

    for label in ["paytm_resume", "optum_resume"]:
        folder  = data_path / label
        company = label.replace("_resume", "").capitalize()
        if not folder.exists():
            print(f"[WARN] {folder} not found")
            continue

        pdfs = list(folder.glob("*.pdf"))
        print(f"[INFO] Scoring {len(pdfs)} resumes from {company}...")

        for pdf in pdfs:
            raw_text = extract_pdf_text(str(pdf))
            if len(raw_text) < 50:
                continue

            ml_result = predict(raw_text, models_dir)

            # Simple keyword-based ATS score
            ats_score = _quick_ats_score(raw_text)

            results.append({
                "file":               pdf.name,
                "source_company":     company,
                "ats_score":          ats_score,
                "ml_predicted_fit":   ml_result.get("predicted_company_fit", "N/A"),
                "paytm_confidence":   ml_result.get("confidence", {}).get("paytm", 0),
                "optum_confidence":   ml_result.get("confidence", {}).get("optum", 0),
                "resume_cluster":     ml_result.get("resume_cluster", -1),
                "cluster_keywords":   ", ".join(ml_result.get("cluster_keywords", [])[:5]),
                "text_length":        len(raw_text),
            })

    # Sort by ATS score desc
    results.sort(key=lambda r: r["ats_score"], reverse=True)

    # Write CSV
    csv_path = os.path.join(out_dir, "ranked_resumes.csv")
    if results:
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
        print(f"[SAVED] {csv_path}  ({len(results)} rows)")

    # Write JSON summary
    summary = {
        "total": len(results),
        "avg_ats_score": round(sum(r["ats_score"] for r in results) / max(len(results), 1), 2),
        "cluster_distribution": dict(Counter(r["resume_cluster"] for r in results)),
        "top_10": results[:10],
    }
    json_path = os.path.join(out_dir, "batch_summary.json")
    with open(json_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"[SAVED] {json_path}")

    return results, summary


def _quick_ats_score(text: str) -> int:
    """
    Rule-based ATS score (0-100) for quick ranking.
    Checks: contact info, key sections, skill density, action verbs.
    """
    score = 0
    lower = text.lower()

    # Contact info (20 pts)
    if re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text): score += 10
    if re.search(r'[6-9]\d{9}|\+91\d{10}', text): score += 10

    # Sections (30 pts)
    sections = ['education', 'skills', 'experience', 'projects', 'certif', 'summary', 'achievements']
    score += min(30, sum(4 for s in sections if s in lower))

    # Skill keywords (25 pts)
    skills = ['python','java','javascript','react','node','sql','machine learning','deep learning',
              'tensorflow','pytorch','aws','docker','git','c++','data','api','html','css']
    found = sum(1 for s in skills if s in lower)
    score += min(25, found * 3)

    # Action verbs (15 pts)
    verbs = ['developed','implemented','designed','built','led','managed','optimized',
             'created','automated','deployed','analyzed','integrated','architected']
    found_verbs = sum(1 for v in verbs if v in lower)
    score += min(15, found_verbs * 2)

    # Length bonus (10 pts)
    words = len(text.split())
    if words > 400: score += 10
    elif words > 200: score += 5

    return min(100, score)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir",   default="..",    help="Parent dir with paytm_resume/ optum_resume/")
    parser.add_argument("--models_dir", default="models", help="Trained models dir")
    parser.add_argument("--out_dir",    default="results", help="Output directory")
    args = parser.parse_args()

    results, summary = score_all(args.data_dir, args.models_dir, args.out_dir)
    print(f"\n✅ Batch scoring complete!")
    print(f"   Total resumes : {summary['total']}")
    print(f"   Avg ATS score : {summary['avg_ats_score']}")
