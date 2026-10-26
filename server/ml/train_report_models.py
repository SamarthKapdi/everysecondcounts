"""
Every Second Counts — Report ML Models Trainer
Trains two local models:
1. Report Category Classifier (TF-IDF + LogisticRegression)
   Categories: CBC, LIPID, DIABETES, LIVER, KIDNEY, THYROID, VITAMINS, CARDIOLOGY, GENERAL
2. Report Severity Classifier (LogisticRegression on flagged vector)
   Severity: NORMAL, MONITOR, CONSULT_SOON, URGENT

Saves: server/ml/models/report_models.pkl
Documents: docs/report-model-metrics.md
"""

import os
import sys
import random
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'report_models.pkl')
DOCS_PATH = os.path.join(SCRIPT_DIR, '..', '..', 'docs', 'report-model-metrics.md')

# ── 1. Generate Synthetic Training Data for Report Category Classifier ────────
CATEGORIES = {
    'CBC': {
        'specialist': 'Hematologist',
        'keywords': ['hemoglobin', 'rbc', 'wbc', 'platelet', 'hematocrit', 'pcv', 'mcv', 'mch', 'mchc', 'neutrophil', 'lymphocyte', 'eosinophil', 'esr', 'leukocyte count', 'complete blood count', 'peripheral smear']
    },
    'LIPID': {
        'specialist': 'Cardiologist',
        'keywords': ['cholesterol', 'triglycerides', 'hdl', 'ldl', 'vldl', 'lipid profile', 'coronary risk', 'non hdl cholesterol', 'atherogenic index']
    },
    'DIABETES': {
        'specialist': 'Endocrinologist',
        'keywords': ['glucose', 'fasting blood sugar', 'postprandial', 'hba1c', 'glycated hemoglobin', 'insulin fasting', 'random blood glucose', 'ogtt', 'estimated average glucose']
    },
    'LIVER': {
        'specialist': 'Hepatologist / Gastroenterologist',
        'keywords': ['bilirubin', 'sgot', 'ast', 'sgpt', 'alt', 'alkaline phosphatase', 'alp', 'total protein', 'albumin', 'globulin', 'ggt', 'liver function test', 'lft panel']
    },
    'KIDNEY': {
        'specialist': 'Nephrologist',
        'keywords': ['creatinine', 'urea', 'bun', 'uric acid', 'kidney function test', 'kft panel', 'renal profile', 'estimated gfr', 'urine microalbumin']
    },
    'THYROID': {
        'specialist': 'Endocrinologist',
        'keywords': ['tsh', 'total t3', 'total t4', 'free t3', 'free t4', 'thyroid profile', 'thyroid stimulating hormone', 'triiodothyronine', 'thyroxine']
    },
    'VITAMINS': {
        'specialist': 'General Physician / Nutritionist',
        'keywords': ['vitamin d', '25 hydroxy vitamin d', 'vitamin b12', 'cyanocobalamin', 'folate', 'ferritin', 'iron profile', 'serum calcium', 'electrolyte sodium potassium']
    },
    'CARDIOLOGY': {
        'specialist': 'Cardiologist',
        'keywords': ['troponin', 'cpk-mb', 'pro-bnp', 'ecg', 'echocardiogram', 'ejection fraction', 'sinus rhythm', 'cardiac biomarkers', 'myoglobin']
    },
    'GENERAL': {
        'specialist': 'General Physician',
        'keywords': ['routine physical examination', 'general wellness panel', 'vital signs baseline', 'health checkup', 'urinalysis general']
    }
}

def generate_category_dataset(n_per_cat=120):
    samples = []
    labels = []
    templates = [
        "LABORATORY TEST REPORT\nPatient Name: Sample\n{items}\nReport Verified by Pathologist",
        "CLINICAL BIOCHEMISTRY DEPARTMENT\nInvestigation Findings:\n{items}\nMethodology: Automated Spectrophotometry",
        "DIAGNOSTIC REPORT SUMMARY\nTests Requested: {items}\nStatus: Completed",
        "HEALTHCARE DIAGNOSTICS LAB\nParameter Details:\n{items}\nReference values as per NABL guidelines",
        "{items}\nClinical notes: correlate with patient medical status."
    ]

    for cat, info in CATEGORIES.items():
        kw_pool = info['keywords']
        for _ in range(n_per_cat):
            # Select 3-7 keywords
            chosen = random.sample(kw_pool, min(len(kw_pool), random.randint(3, 7)))
            # Add synthetic values
            lines = []
            for kw in chosen:
                val = round(random.uniform(5, 250), 1)
                lines.append(f"{kw.upper()}: {val} {random.choice(['mg/dL', 'g/dL', 'U/L', 'mcg/dL', '%'])}")
            body = "\n".join(lines)
            tmpl = random.choice(templates)
            text = tmpl.format(items=body)
            samples.append(text)
            labels.append(cat)

    return samples, labels

# ── 2. Generate Synthetic Training Data for Severity Classifier ──────────────
# Vector features: [num_critical, num_high, num_low, total_tests, abnormal_ratio]
def generate_severity_dataset(n_samples=1600):
    X = []
    y = []

    for _ in range(n_samples):
        n_crit = np.random.choice([0, 1, 2, 3], p=[0.75, 0.15, 0.07, 0.03])
        n_high = np.random.poisson(1.2)
        n_low = np.random.poisson(0.8)
        total = max(3, n_crit + n_high + n_low + np.random.randint(1, 10))
        abnormal = n_crit + n_high + n_low
        ratio = abnormal / total

        # Ground truth clinical assignment rules
        if n_crit > 0 or (n_high >= 3 and ratio >= 0.6):
            sev = 'URGENT'
        elif (n_high + n_low) >= 3 or ratio >= 0.4:
            sev = 'CONSULT_SOON'
        elif (n_high + n_low) >= 1:
            sev = 'MONITOR'
        else:
            sev = 'NORMAL'

        X.append([n_crit, n_high, n_low, total, round(ratio, 4)])
        y.append(sev)

    return np.array(X), np.array(y)

def train_and_evaluate():
    print("=" * 60)
    print("  Training Local Medical Report Analysis ML Models")
    print("=" * 60)

    # 1. Train Category Classifier
    cat_texts, cat_labels = generate_category_dataset(150)
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        cat_texts, cat_labels, test_size=0.2, random_state=42, stratify=cat_labels
    )

    cat_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=3000, sublinear_tf=True, lowercase=True)),
        ('clf', LogisticRegression(C=5.0, max_iter=1000, random_state=42))
    ])
    cat_pipeline.fit(X_train_c, y_train_c)
    cat_preds = cat_pipeline.predict(X_test_c)
    cat_acc = accuracy_score(y_test_c, cat_preds)
    cat_cv = cross_val_score(cat_pipeline, cat_texts, cat_labels, cv=5)
    print(f"\nReport Category Classifier Accuracy: {cat_acc:.4f} ({cat_acc*100:.2f}%) | 5-Fold CV: {cat_cv.mean():.4f} +/- {cat_cv.std():.4f}")
    cat_report = classification_report(y_test_c, cat_preds, digits=4)
    print(cat_report)

    # 2. Train Severity Classifier
    X_sev, y_sev = generate_severity_dataset(2000)
    X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(
        X_sev, y_sev, test_size=0.2, random_state=42, stratify=y_sev
    )
    sev_clf = LogisticRegression(C=2.0, max_iter=1000, class_weight='balanced', random_state=42)
    sev_clf.fit(X_train_s, y_train_s)
    sev_preds = sev_clf.predict(X_test_s)
    sev_acc = accuracy_score(y_test_s, sev_preds)
    sev_cv = cross_val_score(sev_clf, X_sev, y_sev, cv=5)
    print(f"\nReport Severity Classifier Accuracy: {sev_acc:.4f} ({sev_acc*100:.2f}%) | 5-Fold CV: {sev_cv.mean():.4f} +/- {sev_cv.std():.4f}")
    sev_report = classification_report(y_test_s, sev_preds, digits=4)
    print(sev_report)

    # Save Models
    os.makedirs(MODEL_DIR, exist_ok=True)
    payload = {
        'category_pipeline': cat_pipeline,
        'severity_classifier': sev_clf,
        'specialists_map': {cat: info['specialist'] for cat, info in CATEGORIES.items()},
        'categories': list(CATEGORIES.keys())
    }
    joblib.dump(payload, MODEL_PATH)
    print(f"\nSaved models to: {MODEL_PATH}")

    # Generate docs/report-model-metrics.md
    os.makedirs(os.path.dirname(DOCS_PATH), exist_ok=True)
    md_content = f"""# Local Medical Report Analysis Model Metrics

## Overview
Every Second Counts uses a **two-stage local ML + rule-based pipeline** for analyzing laboratory reports and medical documents without calling external AI APIs (no LLMs or cloud endpoints).

1. **Stage 1: Report Category Classification**  
   Architecture: TF-IDF Vectorizer (unigram + bigram) -> LogisticRegression (C=5.0)  
   Predicts the primary diagnostic category (`CBC`, `LIPID`, `DIABETES`, `LIVER`, `KIDNEY`, `THYROID`, `VITAMINS`, `CARDIOLOGY`, `GENERAL`) and maps it to the appropriate clinical specialist.

2. **Stage 2: Report Severity Classification**  
   Architecture: Logistic Regression on clinical vector `[num_critical, num_high, num_low, total_tests, abnormal_ratio]`  
   Predicts overall urgency: `NORMAL`, `MONITOR`, `CONSULT_SOON`, `URGENT`.

---

## Dataset & Training Methodology
- **Dataset Origin**: Programmatically generated synthetic corpus ({len(cat_texts)} category texts, {len(X_sev)} severity vectors) modeling realistic lab report templates, vocabulary variations, units, and clinical cutoff distributions.
- **Explicit Disclosure**: As with the triage model, this dataset is **synthetic** and designed for clinical decision-support and workflow routing demonstrations, not FDA-cleared diagnostic certification.

---

## Performance Metrics

### 1. Report Category Classifier
- **Overall Test Accuracy**: {cat_acc:.4f} ({cat_acc*100:.2f}%)
- **5-Fold Cross-Validation**: {cat_cv.mean():.4f} +/- {cat_cv.std():.4f}

```
{cat_report}
```

### 2. Report Severity Classifier
- **Overall Test Accuracy**: {sev_acc:.4f} ({sev_acc*100:.2f}%)
- **5-Fold Cross-Validation**: {sev_cv.mean():.4f} +/- {sev_cv.std():.4f}

```
{sev_report}
```

---

## Pipeline Integration
Exposed locally via FastAPI microservice at `POST /analyze-report`. Fully self-contained on localhost with zero external network egress.
"""

    with open(DOCS_PATH, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Metrics documentation written to: {DOCS_PATH}")

if __name__ == '__main__':
    train_and_evaluate()
