"""
Every Second Counts AI — Symptom Triage ML Model Training Script

Trains a TF-IDF + LinearSVC (Support Vector Classifier) pipeline to classify
symptom text into emergency triage severity levels: GREEN, YELLOW, ORANGE, RED.

Usage:
    python train_model.py

Outputs:
    - models/triage_model.pkl      (trained pipeline)
    - models/triage_vectorizer.pkl (fitted TF-IDF vectorizer — included in pipeline but also saved separately)
    - ../docs/model-metrics.md     (classification report for academic paper)
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score
)

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, 'dataset', 'symptom_severity_dataset.csv')
MODEL_DIR = os.path.join(SCRIPT_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'triage_model.pkl')
METRICS_PATH = os.path.join(SCRIPT_DIR, '..', 'docs', 'model-metrics.md')


def train():
    print('=' * 60)
    print('  Every Second Counts AI — ML Triage Model Training')
    print('=' * 60)

    # ── 1. Load dataset ──────────────────────────────────────────────────
    if not os.path.exists(DATASET_PATH):
        print(f'\n❌ Dataset not found at: {DATASET_PATH}')
        print('   Run generate_dataset.py first.')
        sys.exit(1)

    df = pd.read_csv(DATASET_PATH)
    print(f'\n📂 Loaded dataset: {len(df)} samples')
    print(f'   Columns: {list(df.columns)}')
    print(f'\n   Class distribution:')
    for sev in ['GREEN', 'YELLOW', 'ORANGE', 'RED']:
        count = len(df[df['severity'] == sev])
        print(f'     {sev:8s}: {count:4d} ({count/len(df)*100:.1f}%)')

    X = df['symptoms'].values
    y = df['severity'].values

    # ── 2. Train/test split (80/20, stratified) ──────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f'\n📊 Split: {len(X_train)} train / {len(X_test)} test')

    # ── 3. Build pipeline: TF-IDF → CalibratedClassifierCV(LinearSVC) ───
    # We wrap LinearSVC in CalibratedClassifierCV to get probability estimates
    # (LinearSVC doesn't natively support predict_proba)
    print('\n🔧 Building pipeline: TF-IDF (unigram+bigram) → LinearSVC (calibrated)')

    base_svc = LinearSVC(
        C=1.0,
        max_iter=10000,
        class_weight='balanced',  # Handle any residual class imbalance
        random_state=42
    )

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),       # Unigrams + bigrams
            max_features=5000,
            sublinear_tf=True,        # Apply sublinear TF scaling
            strip_accents='unicode',
            lowercase=True,
            stop_words='english'
        )),
        ('classifier', CalibratedClassifierCV(
            estimator=base_svc,
            cv=3,                     # 3-fold internal CV for calibration
            method='sigmoid'
        ))
    ])

    # ── 4. Train ─────────────────────────────────────────────────────────
    print('\n🚀 Training...')
    pipeline.fit(X_train, y_train)
    print('   ✅ Training complete')

    # ── 5. Evaluate ──────────────────────────────────────────────────────
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    report_text = classification_report(y_test, y_pred,
                                         target_names=['GREEN', 'ORANGE', 'RED', 'YELLOW'],
                                         digits=4)
    cm = confusion_matrix(y_test, y_pred, labels=['GREEN', 'YELLOW', 'ORANGE', 'RED'])

    print(f'\n📈 Test Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)')
    print(f'\n{report_text}')

    print('\n📋 Confusion Matrix (rows=actual, cols=predicted):')
    print(f'   {"":>10} {"GREEN":>8} {"YELLOW":>8} {"ORANGE":>8} {"RED":>8}')
    for i, label in enumerate(['GREEN', 'YELLOW', 'ORANGE', 'RED']):
        row = '   '.join(f'{v:>8d}' for v in cm[i])
        print(f'   {label:>10} {row}')

    # ── 6. Cross-validation ──────────────────────────────────────────────
    print('\n🔄 Running 5-fold cross-validation on full dataset...')
    cv_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2), max_features=5000,
            sublinear_tf=True, strip_accents='unicode',
            lowercase=True, stop_words='english'
        )),
        ('classifier', CalibratedClassifierCV(
            estimator=LinearSVC(C=1.0, max_iter=10000, class_weight='balanced', random_state=42),
            cv=3, method='sigmoid'
        ))
    ])
    cv_scores = cross_val_score(cv_pipeline, X, y, cv=5, scoring='accuracy')
    print(f'   CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}')
    print(f'   Per-fold: {[f"{s:.4f}" for s in cv_scores]}')

    # ── 7. Save model ────────────────────────────────────────────────────
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f'\n💾 Model saved to: {MODEL_PATH}')
    print(f'   File size: {os.path.getsize(MODEL_PATH) / 1024:.1f} KB')

    # ── 8. Generate metrics document ─────────────────────────────────────
    os.makedirs(os.path.dirname(METRICS_PATH), exist_ok=True)

    # Format confusion matrix for markdown
    cm_header = '| Actual \\\\ Predicted | GREEN | YELLOW | ORANGE | RED |'
    cm_divider = '|---|---|---|---|---|'
    cm_rows = []
    for i, label in enumerate(['GREEN', 'YELLOW', 'ORANGE', 'RED']):
        cells = ' | '.join(str(v) for v in cm[i])
        cm_rows.append(f'| **{label}** | {cells} |')

    metrics_md = f"""# Every Second Counts AI — ML Triage Model Metrics

## Model Architecture
- **Pipeline**: TF-IDF Vectorizer → CalibratedClassifierCV(LinearSVC)
- **TF-IDF Config**: Unigrams + Bigrams, max 5000 features, sublinear TF scaling
- **Classifier**: LinearSVC (C=1.0, balanced class weights) wrapped in CalibratedClassifierCV (3-fold, sigmoid)
- **Training Data**: {len(X_train)} samples (80% split)
- **Test Data**: {len(X_test)} samples (20% split)
- **Classes**: GREEN (minor), YELLOW (moderate), ORANGE (urgent), RED (critical)

## Test Set Performance

**Overall Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)**

### Classification Report
```
{report_text}
```

### Confusion Matrix
{cm_header}
{cm_divider}
{chr(10).join(cm_rows)}

### 5-Fold Cross-Validation
- **Mean Accuracy**: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}
- **Per-fold scores**: {', '.join(f'{s:.4f}' for s in cv_scores)}

## Model Integration
The trained model is served via a local FastAPI microservice at `http://localhost:8001/predict`.
It powers Tier 2 of the hybrid triage engine in `aiService.js`.

### Triage Pipeline (3-Tier Hybrid Architecture)
1. **Tier 1 — Rule-Based Pre-Screener**: Keyword matching for critical symptoms (chest pain, stroke, etc.). Guarantees no false negatives for life-threatening emergencies.
2. **Tier 2 — Trained ML Classifier** (this model): TF-IDF + SVM text classification for nuanced triage when rule-based doesn't trigger.
3. **Tier 3 — Deterministic Fallback Scorer**: Weighted symptom scoring engine that activates if the ML service is unavailable.

## Reproducibility
```bash
cd server/ml
pip install -r requirements.txt
python generate_dataset.py
python train_model.py
```
Generated on: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

    with open(METRICS_PATH, 'w', encoding='utf-8') as f:
        f.write(metrics_md)
    print(f'📄 Metrics report saved to: {METRICS_PATH}')

    # ── 9. Quick sanity check ────────────────────────────────────────────
    print('\n🧪 Sanity Check — Sample Predictions:')
    test_cases = [
        'mild headache, runny nose',
        'fever, vomiting, abdominal pain',
        'difficulty breathing, severe pain, confusion',
        'chest pain, unconscious, not breathing',
        'mild cough, sneezing',
        'severe bleeding uncontrolled, trauma',
    ]
    for symptoms in test_cases:
        pred = pipeline.predict([symptoms])[0]
        proba = pipeline.predict_proba([symptoms])[0]
        confidence = max(proba)
        print(f'   "{symptoms}" → {pred} (confidence: {confidence:.2f})')

    print('\n' + '=' * 60)
    print('  ✅ Training Complete — Model ready for deployment')
    print('=' * 60)


if __name__ == '__main__':
    train()
