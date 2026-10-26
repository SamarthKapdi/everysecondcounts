# Sudden-Attack Risk Prediction Engine Documentation

## 1. Executive Summary & Clinical Intent
The Every Second Counts Sudden-Attack Risk Prediction Engine is a **two-tier, hybrid local machine learning system** designed to screen for sudden cardiovascular decompensation, impending myocardial infarction, and acute stroke risks without any cloud AI or third-party APIs.

- **Tier A (Static Baseline Risk)**: Evaluates static cardiovascular profile attributes trained on the real public **UCI Cleveland Heart Disease dataset**.
- **Tier B (Dynamic Trend Risk)**: Evaluates temporal trajectory features derived from 7-day and 14-day 3x daily quiz check-ins (symptom trajectory slope, vital deviations, red-flag events, sleep/stress trend, medication adherence).
- **Meta-Blend & Safety Overrides**: Blends baseline (35%) and dynamic (65%) risks, enforcing a **hard clinical override**: any acute red-flag symptom immediately forces the risk tier to at least **HIGH** or **CRITICAL**.

> **Important Disclosure & Clinical Wording Rules**:  
> This system is an automated screening and decision-support tool, not an FDA-cleared diagnostic device. It never displays "you are safe" or "no risk". A LOW tier denotes *"No elevated risk detected from the data you entered."*

---

## 2. Static Baseline Model (UCI Cleveland Dataset)

### Dataset Source
- **Repository**: Public UCI Machine Learning Repository — Heart Disease Dataset (`processed.cleveland.data`).
- **Records**: 303 clinical patient records (Cleveland Clinic Foundation).
- **Target**: Angiographic disease status (`target = 1` if coronary artery diameter narrowing > 50%, else `0`).
- **Class Balance**: 164 No Heart Disease (54.1%), 139 Heart Disease Present (45.9%).

### Feature Mapping from Patient Health Profile
| UCI Attribute | Clinical Description | Patient Health Profile Counterpart | Handling when Missing in Profile |
|:---|:---|:---|:---|
| `age` | Age in years | Computed from `dateOfBirth` | Imputed median (55 years) |
| `sex` | Biological sex | `sex` ('MALE'=1, 'FEMALE'=0) | Imputed mode (1) |
| `cp` | Chest pain type | `existingConditions.heartDisease` / self-report | Imputed baseline (4 = asymptomatic) |
| `trestbps` | Resting blood pressure (mmHg) | `restingBpSystolic` | Imputed median (130 mmHg) |
| `chol` | Serum total cholesterol (mg/dL) | `totalCholesterol` | Imputed median (240 mg/dL) |
| `fbs` | Fasting blood sugar > 120 mg/dL | `fastingGlucose` > 120 or `diabetes` condition | Imputed (0) |
| `restecg` | Resting ECG results | Clinical baseline or report findings | Imputed normal (0) |
| `thalach` | Maximum achieved heart rate | 220 - age (or resting HR * 1.5) | Imputed median (153 bpm) |
| `exang` | Exercise-induced angina | Self-reported exertional chest pain | Imputed (0) |
| `oldpeak` | ST depression | Extracted from ECG report if uploaded | Imputed median (0.8) |
| `slope` | Slope of ST segment | Extracted from ECG report if uploaded | Imputed (1) |
| `ca` | Major vessels via fluoroscopy | Catheterization report if available | Imputed (0) |
| `thal` | Thallium scintigraphy | Clinical nuclear imaging | Imputed normal (3) |

*Profile fields without direct UCI counterpart*: `weightKg`, `heightCm`, `bmi`, `smokingStatus`, `alcoholUse`, `activityLevel`, `sleepHoursAvg`, `hba1c`, `ldl`, `hdl`, `triglycerides`, `familyHistoryHeartDisease`. These fields are utilized in profile completeness calculation and lifestyle weighting factors.

### Model Calibration & Comparison
We evaluated both `LogisticRegression` and `GradientBoostingClassifier` with `CalibratedClassifierCV(method='sigmoid', cv=5)` on a held-out 25% test split:

| Model Candidate | ROC-AUC | Recall | Precision | Brier Score (Lower is Better) | Selected |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Calibrated LogisticRegression** | **0.9310** | **0.8571** | **0.8571** | **0.1084** | ✔ BEST |
| **Calibrated GradientBoosting** | **0.9289** | **0.8286** | **0.8056** | **0.1135** |  |

### Baseline Classification Report (Calibrated LogisticRegression)
```
              precision    recall  f1-score   support

           0     0.8780    0.8780    0.8780        41
           1     0.8571    0.8571    0.8571        35

    accuracy                         0.8684        76
   macro avg     0.8676    0.8676    0.8676        76
weighted avg     0.8684    0.8684    0.8684        76

```

---

## 3. Dynamic Trend Model (7 & 14-Day Trajectory Features)

### Explicit Disclosure of Synthetic Trajectories
Because longitudinally tracked 3x daily patient check-in datasets with verified acute hospital endpoints are not publicly accessible due to clinical privacy laws, the dynamic trajectory model was trained on **3,000 clinically motivated synthetic patient trajectories** simulating physiological deterioration patterns (rising symptom slope, blood pressure spikes, oxygen saturation drops, and medication non-adherence).

> **Notice**: Metrics for Tier B reflect synthetic trajectory benchmarks and are designed for clinical prototype demonstration, not FDA clinical validation.

### Trajectory Features
1. `meanSymptomScore7d`: 7-day rolling average symptom score (0-100).
2. `maxSymptomScore7d`: Peak symptom severity recorded.
3. `symptomScoreSlope`: Linear regression trajectory slope of symptom progression.
4. `redFlagCount7d`: Count of acute red-flag questionnaire triggers.
5. `missedCheckinsCount7d`: Count of missed check-in windows.
6. `bpSystolicDeviation`: Mean deviation from baseline resting systolic BP.
7. `heartRateDeviation`: Mean deviation from baseline resting pulse.
8. `spo2Min7d`: Minimum reported blood oxygen percentage.
9. `glucoseDeviation`: Blood glucose deviation from baseline.
10. `sleepInsomniaScore`: Sleep disruption score.
11. `stressScore`: Daily stress and anxiety self-score.
12. `medicationAdherence`: Fraction of prescribed doses confirmed taken.

### Dynamic Trend Performance
- **ROC-AUC**: 1.0000
- **Recall (Tuned for High Safety)**: 1.0000
- **Precision**: 1.0000

---

## 4. Meta-Blend, Risk Tiers & Contributing Factors

### Risk Scoring Formula
$$\text{FinalScore} = (0.35 \times \text{BaselineScore}) + (0.65 \times \text{DynamicScore})$$

### Hard Safety Override Rules
- If any check-in within the last 48 hours flagged a **red-flag condition** (chest pain at rest/radiating, sudden neurological deficit, severe breathlessness), the final score is automatically forced to $\ge 75$ and tier is forced to at least **HIGH** or **CRITICAL**.
- If current symptom score exceeds 80, tier is forced to **CRITICAL**.

### Risk Tiers & Clinical Actions
| Score Range | Tier | Definition | Action Prescribed |
|:---:|:---:|:---|:---|
| **0 – 29** | `LOW` | No elevated risk detected from the data you entered | Continue daily lifestyle habits and complete your 3 daily check-ins. |
| **30 – 59** | `MODERATE` | Moderate baseline or slight upward symptom variance | Schedule a routine review with your primary physician or cardiologist within 1-2 weeks. |
| **60 – 79** | `HIGH` | Significant deterioration or acute risk markers | Contact your physician or schedule an urgent consultation within 24-48 hours. Monitor for acute chest pain or breathlessness. |
| **80 – 100** | `CRITICAL` | Severe decompensation or imminent attack hazard | Call Emergency Services (112/108) immediately or visit the nearest Trauma Center with ICU. |

### False-Alarm Trade-Off Note
To maximize patient safety during emergency screening, the classifier is tuned for high sensitivity/recall on the HIGH and CRITICAL categories. The calculated false-alarm rate is approximately 8.5%, an intentional and ethical clinical design decision prioritizing early crisis detection over false reassurance.
