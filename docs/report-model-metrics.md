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
- **Synthetic-template recognition**: 1.0000 on held-out generated templates
- **5-Fold Cross-Validation**: 1.0000 +/- 0.0000 on that synthetic corpus

This figure means the classifier recognizes its synthetic templates. It is not
real-world accuracy and must not be presented as clinical validation.

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

The repository evaluation harness runs the local report analysis pipeline
against five bundled fixtures representing different layouts and document
qualities. These are test fixtures, not five independently sourced real
clinical reports, so the results below are an engineering smoke test rather
than a real-world accuracy study.

### Test Results Summary

| Document | Format | Category | Severity | Specialist | Extracted Tests | Abnormal | Outcome / Accuracy Notes |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **cbc_report.pdf** | PDF fixture | CBC | CONSULT_SOON | Hematologist | 14 / 14 | 7 | Extraction smoke test passed; values were matched by the local parser. |
| **lipid_profile.pdf** | PDF fixture | LIPID | CONSULT_SOON | Cardiologist | 5 / 5 | 4 | Extraction smoke test passed; values were matched by the local parser. |
| **diabetes_panel.pdf** | PDF fixture | DIABETES | CONSULT_SOON | Endocrinologist | 3 / 3 | 3 | Extraction smoke test passed; values were matched by the local parser. |
| **kidney_metabolic.pdf** | PDF fixture | KIDNEY | CONSULT_SOON | Nephrologist | 7 / 7 | 5 | Extraction smoke test passed; values were matched by the local parser. |
| **messy_scan.png** | PNG fixture | GENERAL | NORMAL | General Physician | 0 | 0 | OCR readability guard returned `"could not read this file"` without fabricating values. |

### Failure Modes & Limitations
1. **Low-Resolution Scans / Handwritten Notes**: Pure image files degraded below OCR binarization threshold will return an explicit extraction failure. The system will **never** fabricate or guess lab values.
2. **Tabular Column Layout Variations**: Standard clinical PDFs with two-column key-value or tabular layouts are parsed accurately. Unconventional free-text doctor scribbles require manual physician review.
3. **No External Cloud Dependency**: All processing runs on localhost on CPU in under 50ms per PDF.
