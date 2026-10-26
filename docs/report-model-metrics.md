# Local Medical Report Analysis Model Metrics

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
- **Dataset Origin**: Programmatically generated synthetic corpus (1350 category texts, 2000 severity vectors) modeling realistic lab report templates, vocabulary variations, units, and clinical cutoff distributions.
- **Explicit Disclosure**: As with the triage model, this dataset is **synthetic** and designed for clinical decision-support and workflow routing demonstrations, not FDA-cleared diagnostic certification.

---

## Performance Metrics

### 1. Report Category Classifier
- **Overall Test Accuracy**: 1.0000 (100.00%)
- **5-Fold Cross-Validation**: 1.0000 +/- 0.0000

```
              precision    recall  f1-score   support

  CARDIOLOGY     1.0000    1.0000    1.0000        30
         CBC     1.0000    1.0000    1.0000        30
    DIABETES     1.0000    1.0000    1.0000        30
     GENERAL     1.0000    1.0000    1.0000        30
      KIDNEY     1.0000    1.0000    1.0000        30
       LIPID     1.0000    1.0000    1.0000        30
       LIVER     1.0000    1.0000    1.0000        30
     THYROID     1.0000    1.0000    1.0000        30
    VITAMINS     1.0000    1.0000    1.0000        30

    accuracy                         1.0000       270
   macro avg     1.0000    1.0000    1.0000       270
weighted avg     1.0000    1.0000    1.0000       270

```

### 2. Report Severity Classifier
- **Overall Test Accuracy**: 0.9750 (97.50%)
- **5-Fold Cross-Validation**: 0.9795 +/- 0.0051

```
              precision    recall  f1-score   support

CONSULT_SOON     0.9213    1.0000    0.9590       117
     MONITOR     1.0000    1.0000    1.0000       134
      NORMAL     1.0000    1.0000    1.0000        40
      URGENT     1.0000    0.9083    0.9519       109

    accuracy                         0.9750       400
   macro avg     0.9803    0.9771    0.9777       400
weighted avg     0.9770    0.9750    0.9749       400

```

---

## Pipeline Integration
Exposed locally via FastAPI microservice at `POST /analyze-report`. Fully self-contained on localhost with zero external network egress.

---

## Real-World & Multi-Source Document Evaluation

We tested the local report analysis pipeline against 5 differently-sourced sample clinical documents representing various formats, layouts, and document qualities (including one degraded noisy scan).

### Test Results Summary

| Document | Format | Category | Severity | Specialist | Extracted Tests | Abnormal | Outcome / Accuracy Notes |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **cbc_report.pdf** | PDF | CBC | CONSULT_SOON | Hematologist | 14 / 14 | 7 | **100% extraction accuracy**. Successfully flagged low Hemoglobin, low RBC, high WBC, low PCV, low MCV, low MCH, high Neutrophils, and high ESR. |
| **lipid_profile.pdf** | PDF | LIPID | CONSULT_SOON | Cardiologist | 5 / 5 | 4 | **100% extraction accuracy**. Correctly identified high Total Cholesterol (248), high Triglycerides (285), low HDL (36), and high LDL (164). |
| **diabetes_panel.pdf** | PDF | DIABETES | CONSULT_SOON | Endocrinologist | 3 / 3 | 3 | **100% extraction accuracy**. Correctly identified high Fasting Glucose (168), high Postprandial Glucose (242), and high HbA1c (8.6%). |
| **kidney_metabolic.pdf** | PDF | KIDNEY | CONSULT_SOON | Nephrologist | 7 / 7 | 5 | **100% extraction accuracy**. Identified elevated Creatinine (2.9), BUN (44), Urea (88), Uric Acid (8.4), and high Potassium (5.7). |
| **messy_scan.png** | PNG (Image) | GENERAL | NORMAL | General Physician | 0 | 0 | **Honest Extraction Guard**. The degraded, low-contrast scan failed OCR readability threshold (<20 characters of valid text). Rather than hallucinating clinical values, the system returned a transparent `"could not read this file"` failure response advising the user to upload a digital PDF or high-resolution document. |

### Failure Modes & Limitations
1. **Low-Resolution Scans / Handwritten Notes**: Pure image files degraded below OCR binarization threshold will return an explicit extraction failure. The system will **never** fabricate or guess lab values.
2. **Tabular Column Layout Variations**: Standard clinical PDFs with two-column key-value or tabular layouts are parsed accurately. Unconventional free-text doctor scribbles require manual physician review.
3. **No External Cloud Dependency**: All processing runs on localhost on CPU in under 50ms per PDF.
