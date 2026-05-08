# 🤖 Resumate ML Pipeline

End-to-end machine learning pipeline that trains on **150+ real Paytm & Optum resumes** and powers intelligent resume analysis on your website.

---

## 📁 Files

| File | Purpose |
|---|---|
| `train_model.py` | Full ML training pipeline (TF-IDF + Logistic Regression + KMeans) |
| `batch_score.py` | Score all resumes in bulk, output ranked CSV |
| `matcher.py` | NLP job-role matching (cosine similarity) |
| `batch_match.py` | Batch job matching across multiple candidates |
| `requirements.txt` | Python dependencies |
| `models/` | Saved trained models (created after training) |
| `results/` | Batch scoring outputs |

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
cd job_matcher
pip install -r requirements.txt
```

### 2. Train the model
```bash
# Trains on paytm_resume/ and optum_resume/ folders
python train_model.py --data_dir ..
```

This produces `models/` containing:
- `tfidf_vectorizer.pkl` – TF-IDF feature extractor
- `classifier.pkl` – Company fit predictor (Paytm vs Optum)
- `cluster_model.pkl` – KMeans resume clusterer (5 profiles)
- `label_encoder.pkl` – Label mapping
- `training_report.json` – Accuracy, cluster summaries

### 3. Batch score all resumes
```bash
python batch_score.py --data_dir ..
# Output: results/ranked_resumes.csv, results/batch_summary.json
```

### 4. Test inference on a single resume
```bash
python train_model.py --predict "Python developer with React and AWS experience..."
```

---

## 🔗 Integration with Node.js Backend

The `utils/mlPredictor.js` file bridges Python ↔ Node.js via `child_process`. It is automatically called during `/api/analyze/:resumeId` and adds an `mlInsights` block to the analysis response:

```json
{
  "mlInsights": {
    "available": true,
    "predictedCompanyFit": "Optum",
    "fitConfidence": 73,
    "resumeProfile": "Full-Stack Developer",
    "clusterKeywords": ["react", "nodejs", "mongodb", "aws", "docker"],
    "insightSummary": "Your resume matches Full-Stack Developer profiles at 73% confidence..."
  }
}
```

The `MLInsights.jsx` React component renders this data in the Analyze page.

---

## 🧠 ML Architecture

```
PDF Text
  ↓
Preprocessing (stop-word removal, normalisation)
  ↓
TF-IDF Vectorisation (5000 features, bigrams)
  ↓
┌─────────────────┬─────────────────────┐
│ LogReg          │ KMeans              │
│ Company Fit     │ Resume Clustering   │
│ (Paytm/Optum)   │ (5 profiles)        │
└─────────────────┴─────────────────────┘
```

---

## 📊 Expected Results

With 150+ labelled resumes:
- **Classifier accuracy**: ~75–85%
- **Clusters**: Full-Stack, Data/ML, Backend, Frontend, DevOps profiles
- **Batch scoring**: ATS scores for every resume in ~30 seconds
