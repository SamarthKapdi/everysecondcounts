# 🏛️ Every Second Counts — Fully Local Architecture & Machine Learning Stack

## Executive Summary & Zero-API-Key Guarantee

Every Second Counts runs **100% locally** with **zero external AI API calls, zero API keys, and zero cloud dependency**. All models, inference engines, laboratory extraction pipelines, and triage classifiers operate on-premises using lightweight, calibrated, and reproducible Scikit-Learn and PyMuPDF microservices.

```mermaid
flowchart TD
    subgraph Client [React + Vite Frontend (Port 5173)]
        UI1[Emergency Triage UI]
        UI2[First-Aid Chatbot UI]
        UI3[Medical Report Analyzer UI]
        UI4[3x Daily Check-in Quiz UI]
        UI5[Sudden-Attack Risk Dashboard]
        UI6[Doctor Patient Timeline & Badges]
    end

    subgraph Backend [Node.js Express Server (Port 5000)]
        API1[/api/emergencies - Triage API]
        API2[/api/chat - First-Aid Chatbot API]
        API3[/api/symptoms/report-analyze-stream]
        API4[/api/health/profile - Patient Profile]
        API5[/api/checkins - 3x Daily Quiz & Slots]
        API6[/api/risk - Sudden-Attack Risk API]
        Socket[Socket.IO Real-Time Alert Layer]
        Fallback[Deterministic Clinical Fallback Engine]
        DB[(PostgreSQL + Prisma ORM)]
    end

    subgraph MLService [Local FastAPI Microservice (Port 8001)]
        M1[Triage Classifier: TF-IDF + Calibrated LinearSVC]
        M2[First-Aid Intent: TF-IDF + LogisticRegression]
        M3[Report Analyzer: PyMuPDF + 50+ Lab Regex + ML Classifiers]
        M4[Sudden-Attack Risk Engine: UCI Cleveland + Trajectory GradientBoosting]
    end

    UI1 --> API1
    UI2 --> API2
    UI3 --> API3
    UI4 --> API5
    UI5 --> API6
    UI6 --> API6

    API1 --> M1
    API2 --> M2
    API3 --> M3
    API5 --> API6
    API6 --> M4

    API6 -. ML Service Offline Fallback .-> Fallback
    API5 & API6 --> Socket
    API1 & API2 & API3 & API4 & API5 & API6 --> DB
```

---

## The 3 Local Machine Learning Engines

### 1. Emergency Symptom Triage Engine (`server/ml/models/triage_model.pkl`)
- **Architecture**: 3-Tier Hybrid Engine:
  1. *Tier 1 (Deterministic Red-Flag Rules)*: Instant rule override (< 1ms) for catastrophic presentations (crushing chest pain, severe arterial bleeding, anaphylaxis, FAST stroke signs).
  2. *Tier 2 (Calibrated ML Classifier)*: TF-IDF feature extraction (n-gram 1-2, 2,000 max features) + Linear Support Vector Classifier wrapped with `CalibratedClassifierCV(method='sigmoid', cv=5)` to produce well-calibrated confidence probabilities.
  3. *Tier 3 (Deterministic Clinical Fallback)*: Keyword heuristic scoring if the ML microservice is unreachable.
- **Performance**:
  - **97.66% Accuracy**, **97.69% 5-fold CV**, **AUC = 0.9986**.
- **Documentation**: [`docs/model-metrics.md`](./model-metrics.md).

### 2. Medical Report & Laboratory Analyzer (`server/ml/models/report_models.pkl`)
- **Extraction Pipeline**:
  - Native digital PDF parsing via PyMuPDF (`fitz`), with optional Tesseract OCR for image formats (`.png`, `.jpg`).
  - 50+ laboratory parameter regex dictionary with synonym matching, unit normalization, and age/sex physiological reference ranges.
  - Transparent guard against low-contrast or illegible files (returns `"could not read this file"` rather than hallucinating findings).
- **ML Classifiers**:
  - *Category Classifier*: Multinomial Naive Bayes / SGDClassifier recognizes its synthetic templates across 9 diagnostic panels; this is not real-world accuracy or clinical validation.
  - *Severity Classifier*: Random Forest / Logistic Regression (97.5% test accuracy) predicting severity classes (`NORMAL`, `MONITOR`, `CONSULT_SOON`, `URGENT`).
  - *Hard Override*: Any parameter breaching critical thresholds (e.g. Troponin I > 0.04 ng/mL, Platelets < 50,000 /uL) automatically forces `URGENT` triage.
- **Documentation**: [`docs/report-model-metrics.md`](./report-model-metrics.md).

### 3. Sudden-Attack Risk Prediction Engine (`server/ml/models/risk_model.pkl`)
- **Multi-Modal Architecture**:
  - *Static Baseline (35% weight)*: Calibrated Logistic Regression trained on public UCI Cleveland Heart Disease dataset (303 records, 13 clinical covariates, Brier score = 0.1084, AUC = 0.9310).
  - *Dynamic Trajectory (65% weight)*: Transparent weighted trend score over symptom level/slope, SpO2 dips, blood-pressure deviation, medication adherence, red flags, and missed check-ins. ML is used for the UCI baseline only.
  - *Meta-Model Blend*: Computes 0–100 sudden-attack risk score categorized into 4 tiers (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
  - *Hard Safety Override*: Any acute red flag in the last 48 hours unconditionally forces a minimum score of 75 and tier `CRITICAL`.
  - *Validity limitation*: the UCI baseline is a proxy for angiographic heart-disease presence; dynamic trajectories and scripted scenarios are synthetic and not clinically validated.
  - *Plain-Language Contributing Factors*: Returns top 3–5 actionable factors with severity badges (`[CRITICAL]`, `[HIGH]`, `[MODERATE]`, `[LOW]`).
  - *Strict Wording Rule*: Never outputs "you are safe" or "no risk". `LOW` tier explicitly displays: *"No elevated risk detected from the data you entered."*
  - *Offline Fallback*: Deterministic clinical guidelines labeled `v1.0-deterministic-fallback (estimated basic mode)`.
- **Documentation**: [`docs/risk-model.md`](./risk-model.md).

---

## 3x Daily Quiz & Check-In Architecture
- **Time Windows**: Enforced in Asia/Kolkata timezone (IST):
  - `MORNING`: 05:00 – 12:00 IST
  - `AFTERNOON`: 12:00 – 17:00 IST
  - `EVENING`: 17:00 – 24:00 IST
- **Constraints**:
  - Duplicate check-ins within the same slot and calendar day are rejected with `409 Conflict`.
  - Health monitoring consent is strictly checked; revoking consent returns `403 Forbidden`.
  - Red-flag answers instantly trigger an emergency modal with 3 nearest ICU-equipped hospitals, create a database alert notification, and emit `emergency:redFlagCheckin` over Socket.IO.

---

## Security & Patient Privacy Access Control
- **Doctor Access**: Clinicians can only view patient timeline, health profile, and risk dashboard if an **active clinical relationship** exists (status `PENDING` or `ACTIVE` in `Consultation`, or non-discharged in `Admission`). Unrelated doctors receive `403 Forbidden`.
- **Zero API Keys**: No keys for OpenAI, Anthropic, or Google Gemini exist anywhere in code, configuration, or environment templates.
