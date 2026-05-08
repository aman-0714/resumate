"""
ML Training Pipeline for Resume Intelligence
=============================================
Trains TF-IDF + Logistic Regression / clustering models
on the Paytm and Optum resume dataset.

Usage:
    python train_model.py --data_dir ../resume_dataset
    python train_model.py --data_dir ../resume_dataset --test

What it produces (saved to ./models/):
    tfidf_vectorizer.pkl    – fitted TF-IDF transformer
    label_encoder.pkl       – company label encoder (Paytm=0, Optum=1)
    classifier.pkl          – Logistic Regression classifier
    cluster_model.pkl       – KMeans resume cluster model
    training_report.json    – accuracy, classification report, cluster stats
"""

import os
import re
import json
import pickle
import argparse
import math
from pathlib import Path
from collections import Counter

# ─── Try to import ML libs (graceful fallback to pure-Python TF-IDF) ──────────
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    print("[WARN] numpy not found. Install: pip install numpy")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.cluster import KMeans
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    from sklearn.preprocessing import LabelEncoder
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("[WARN] scikit-learn not found. Install: pip install scikit-learn")

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import pdfminer
    from pdfminer.high_level import extract_text as pdfminer_extract
    HAS_PDFMINER = True
except ImportError:
    HAS_PDFMINER = False


# ─────────────────────────────────────────────────────────────────────────────
# 1. PDF TEXT EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def extract_pdf_text(pdf_path: str) -> str:
    """Try multiple PDF extractors, return best non-empty result."""
    text = ""

    # Method 1: pdfplumber
    if HAS_PDFPLUMBER and not text:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                pages = [p.extract_text() or "" for p in pdf.pages]
                text = "\n".join(pages).strip()
        except Exception:
            pass

    # Method 2: PyMuPDF
    if HAS_PYMUPDF and len(text) < 100:
        try:
            doc = fitz.open(pdf_path)
            text = "\n".join(page.get_text() for page in doc).strip()
            doc.close()
        except Exception:
            pass

    # Method 3: pdfminer
    if HAS_PDFMINER and len(text) < 100:
        try:
            text = pdfminer_extract(pdf_path) or ""
        except Exception:
            pass

    return text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# 2. TEXT PREPROCESSING
# ─────────────────────────────────────────────────────────────────────────────

STOP_WORDS = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "is","are","was","were","be","been","have","has","had","do","does","did",
    "will","would","could","should","may","might","i","you","he","she","it",
    "we","they","this","that","these","those","my","your","our","their","etc",
    "also","just","more","not","no","so","then","than","as","if","use","used",
}

def preprocess_text(text: str) -> str:
    """Clean and normalise resume text for ML."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s\+\#\.]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = [t for t in text.split() if t not in STOP_WORDS and len(t) > 1]
    return " ".join(tokens)


# ─────────────────────────────────────────────────────────────────────────────
# 3. DATASET LOADER
# ─────────────────────────────────────────────────────────────────────────────

def load_dataset(data_dir: str):
    """
    Expects:
        data_dir/paytm_resume/*.pdf  → label "paytm"
        data_dir/optum_resume/*.pdf  → label "optum"
    Returns: (texts, labels, filenames)
    """
    data_path = Path(data_dir)
    texts, labels, filenames = [], [], []

    for label in ["paytm_resume", "optum_resume"]:
        folder = data_path / label
        if not folder.exists():
            print(f"[WARN] Folder not found: {folder}")
            continue

        company = label.replace("_resume", "")
        pdfs = list(folder.glob("*.pdf"))
        print(f"[INFO] Loading {len(pdfs)} resumes from {label}...")

        for pdf in pdfs:
            text = extract_pdf_text(str(pdf))
            if len(text) < 50:
                print(f"  [SKIP] {pdf.name} — too short ({len(text)} chars)")
                continue
            processed = preprocess_text(text)
            texts.append(processed)
            labels.append(company)
            filenames.append(pdf.name)

    print(f"\n[INFO] Dataset: {len(texts)} resumes | "
          f"Paytm={labels.count('paytm')} | Optum={labels.count('optum')}")
    return texts, labels, filenames


# ─────────────────────────────────────────────────────────────────────────────
# 4. MODEL TRAINING
# ─────────────────────────────────────────────────────────────────────────────

def train(texts, labels, models_dir="models"):
    """Train TF-IDF + Logistic Regression classifier + KMeans clusterer."""
    if not HAS_SKLEARN or not HAS_NUMPY:
        print("[ERROR] scikit-learn and numpy required for training.")
        return None

    os.makedirs(models_dir, exist_ok=True)

    # ── Label encoding ──────────────────────────────────────────────────────
    le = LabelEncoder()
    y  = le.fit_transform(labels)

    # ── TF-IDF vectorisation ─────────────────────────────────────────────────
    print("[TRAIN] Fitting TF-IDF vectorizer...")
    tfidf = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=2,
        sublinear_tf=True,
    )
    X = tfidf.fit_transform(texts)
    print(f"  → Feature matrix: {X.shape}")

    # ── Train/test split ─────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Logistic Regression ──────────────────────────────────────────────────
    print("[TRAIN] Training Logistic Regression classifier...")
    clf = LogisticRegression(max_iter=500, C=1.0, solver='lbfgs')
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True)

    print(f"\n[RESULT] Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # ── KMeans clustering ────────────────────────────────────────────────────
    print("[TRAIN] Fitting KMeans (k=5 resume clusters)...")
    kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
    kmeans.fit(X)

    # Get top terms per cluster
    feature_names = tfidf.get_feature_names_out()
    cluster_summaries = {}
    for i, center in enumerate(kmeans.cluster_centers_):
        top_idx  = center.argsort()[::-1][:15]
        top_terms = [feature_names[j] for j in top_idx]
        cluster_summaries[f"cluster_{i}"] = top_terms

    cluster_dist = Counter(kmeans.labels_)

    # ── Save models ──────────────────────────────────────────────────────────
    models = {
        "tfidf_vectorizer": tfidf,
        "label_encoder":    le,
        "classifier":       clf,
        "cluster_model":    kmeans,
    }
    for name, model in models.items():
        path = os.path.join(models_dir, f"{name}.pkl")
        with open(path, "wb") as f:
            pickle.dump(model, f)
        print(f"  [SAVED] {path}")

    # ── Training report ──────────────────────────────────────────────────────
    report_data = {
        "accuracy": round(acc, 4),
        "classification_report": report,
        "cluster_summaries": cluster_summaries,
        "cluster_distribution": {f"cluster_{k}": int(v) for k, v in cluster_dist.items()},
        "dataset_size": len(texts),
        "feature_count": X.shape[1],
        "label_classes": list(le.classes_),
    }
    report_path = os.path.join(models_dir, "training_report.json")
    with open(report_path, "w") as f:
        json.dump(report_data, f, indent=2)
    print(f"  [SAVED] {report_path}")

    return report_data


# ─────────────────────────────────────────────────────────────────────────────
# 5. INFERENCE HELPER (used by Node.js via child_process)
# ─────────────────────────────────────────────────────────────────────────────

def predict(resume_text: str, models_dir="models") -> dict:
    """Load trained models and predict company fit + cluster for a resume."""
    if not HAS_SKLEARN:
        return {"error": "scikit-learn not installed"}

    try:
        with open(os.path.join(models_dir, "tfidf_vectorizer.pkl"), "rb") as f:
            tfidf = pickle.load(f)
        with open(os.path.join(models_dir, "label_encoder.pkl"), "rb") as f:
            le = pickle.load(f)
        with open(os.path.join(models_dir, "classifier.pkl"), "rb") as f:
            clf = pickle.load(f)
        with open(os.path.join(models_dir, "cluster_model.pkl"), "rb") as f:
            kmeans = pickle.load(f)
    except FileNotFoundError:
        return {"error": "Models not trained yet. Run: python train_model.py"}

    processed  = preprocess_text(resume_text)
    X          = tfidf.transform([processed])
    proba      = clf.predict_proba(X)[0]
    pred_label = le.inverse_transform([proba.argmax()])[0]
    cluster_id = int(kmeans.predict(X)[0])

    result = {
        "predicted_company_fit": pred_label,
        "confidence": {
            cls: round(float(p), 4)
            for cls, p in zip(le.classes_, proba)
        },
        "resume_cluster": cluster_id,
    }

    # Load cluster summary
    report_path = os.path.join(models_dir, "training_report.json")
    if os.path.exists(report_path):
        with open(report_path) as f:
            report = json.load(f)
        result["cluster_keywords"] = report["cluster_summaries"].get(f"cluster_{cluster_id}", [])

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 6. CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Resume ML Training Pipeline")
    parser.add_argument("--data_dir", default="..", help="Path to folder containing paytm_resume/ and optum_resume/")
    parser.add_argument("--models_dir", default="models", help="Output directory for trained models")
    parser.add_argument("--test", action="store_true", help="Run inference test after training")
    parser.add_argument("--predict", type=str, help="Run inference on a single text string")
    args = parser.parse_args()

    if args.predict:
        result = predict(args.predict, args.models_dir)
        print(json.dumps(result, indent=2))
    else:
        texts, labels, filenames = load_dataset(args.data_dir)
        if not texts:
            print("[ERROR] No resume text extracted. Check data_dir and PDF extractors.")
        else:
            report = train(texts, labels, args.models_dir)
            if report:
                print(f"\n✅ Training complete! Accuracy: {report['accuracy']}")

        if args.test and texts:
            print("\n[TEST] Running inference on first resume...")
            result = predict(texts[0], args.models_dir)
            print(json.dumps(result, indent=2))
