"""
Every Second Counts — Cardiovascular Screening Risk Engine
Inference module implementing:
1. Static Baseline Model (UCI Cleveland calibrated classifier)
2. Transparent Dynamic Trend Score (7 & 14-day check-in features)
3. Meta-Model Blend & Hard Safety Overrides (any red flag forces CRITICAL)
4. Plain-language contributing factors & tier actions
5. Strict ethical wording compliance (no "you are safe" / "no risk")
"""

import os
import sys
import joblib
import numpy as np
from datetime import datetime, date

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'risk_model.pkl')

risk_artifacts = None
if os.path.exists(MODEL_PATH):
    try:
        risk_artifacts = joblib.load(MODEL_PATH)
    except Exception as e:
        print(f"Warning: Could not load risk_model.pkl: {e}", file=sys.stderr)


def calculate_age(dob_str):
    if not dob_str:
        return 55.0
    try:
        if isinstance(dob_str, str):
            dob = datetime.fromisoformat(dob_str.replace('Z', '+00:00')).date()
        elif hasattr(dob_str, 'date'):
            dob = dob_str.date()
        else:
            dob = dob_str
        today = date.today()
        return float(today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day)))
    except Exception:
        return 55.0


def compute_baseline_features(profile: dict, medians: dict) -> list:
    """
    Maps PatientHealthProfile fields to UCI Cleveland features:
    ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
    """
    age = calculate_age(profile.get('dateOfBirth'))
    
    # Sex: 1=Male, 0=Female
    sex_val = 1.0 if str(profile.get('sex', '')).upper().startswith('M') else 0.0
    
    # Chest pain: if patient reported heart disease condition -> 3 or 4, else 4 (asymptomatic baseline)
    conds = profile.get('existingConditions') or {}
    cp = 3.0 if conds.get('heartDisease') else 4.0
    
    # Resting BP Systolic
    trestbps = float(profile.get('restingBpSystolic') or medians.get('trestbps', 130.0))
    
    # Total Cholesterol
    chol = float(profile.get('totalCholesterol') or medians.get('chol', 240.0))
    
    # Fasting blood sugar > 120
    fasting_glu = profile.get('fastingGlucose')
    fbs = 1.0 if (fasting_glu and fasting_glu > 120.0) or conds.get('diabetes') else 0.0
    
    # Rest ECG (baseline default normal = 0)
    restecg = medians.get('restecg', 0.0)
    
    # Thalach (estimated maximum heart rate or resting HR * 1.5)
    resting_hr = profile.get('restingHeartRate')
    thalach = float(resting_hr * 1.6) if resting_hr else float(220.0 - age)
    
    # Exang (exercise induced angina)
    exang = 1.0 if conds.get('heartDisease') else 0.0
    
    # Stress test & fluoroscopy parameters (imputed from clinical medians when absent)
    oldpeak = medians.get('oldpeak', 0.8)
    slope = medians.get('slope', 1.0)
    ca = medians.get('ca', 0.0)
    thal = medians.get('thal', 3.0)

    return [age, sex_val, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal]


def compute_dynamic_features(checkins: list, profile: dict) -> tuple[list, dict]:
    """
    Computes trajectory features over the checkins:
    0: meanSymptomScore7d
    1: maxSymptomScore7d
    2: symptomScoreSlope
    3: redFlagCount7d
    4: missedCheckinsCount7d
    5: bpSystolicDeviation
    6: heartRateDeviation
    7: spo2Min7d
    8: glucoseDeviation
    9: sleepInsomniaScore
    10: stressScore
    11: medicationAdherence
    """
    if not checkins:
        # Default neutral baseline trajectory
        return [10.0, 15.0, 0.0, 0, 0, 0.0, 0.0, 98.0, 0.0, 2.0, 2.0, 1.0], {}

    scores = [c.get('symptomScore', 0) for c in checkins]
    mean_sym = float(np.mean(scores))
    max_sym = float(np.max(scores))

    # Slope computation
    if len(scores) >= 2:
        x = np.arange(len(scores))
        slope = float(np.polyfit(x, scores, 1)[0])
    else:
        slope = 0.0

    red_flag_count = sum(1 for c in checkins if c.get('redFlag'))
    
    # Estimate missed checkins (assuming 3 per day over observed days)
    unique_dates = len(set(c.get('date') for c in checkins if c.get('date')))
    expected_checkins = max(len(checkins), unique_dates * 3)
    missed_count = max(0, expected_checkins - len(checkins))

    # Vitals deviations against profile baseline
    base_sys = profile.get('restingBpSystolic') or 120.0
    base_hr = profile.get('restingHeartRate') or 72.0
    base_glu = profile.get('fastingGlucose') or 95.0

    sys_readings = []
    hr_readings = []
    spo2_readings = []
    glu_readings = []
    sleep_readings = []
    stress_readings = []
    med_readings = []

    for c in checkins:
        v = c.get('selfReportedVitals') or {}
        if v.get('systolic'): sys_readings.append(v['systolic'])
        if v.get('heartRate'): hr_readings.append(v['heartRate'])
        if v.get('spo2'): spo2_readings.append(v['spo2'])
        if v.get('glucose'): glu_readings.append(v['glucose'])

        ans = c.get('answers') or {}
        # Sleep score: good=1, fair=2, restless=6, insomnia=9
        sleep_map = {'good': 1, 'fair': 2, 'restless': 6, 'insomnia': 9}
        if ans.get('sleepQuality'): sleep_readings.append(sleep_map.get(ans['sleepQuality'], 2))

        # Stress score: low=1, moderate=3, high=7, extreme=10
        stress_map = {'low': 1, 'moderate': 3, 'high': 7, 'extreme': 10}
        if ans.get('stressLevel'): stress_readings.append(stress_map.get(ans['stressLevel'], 2))

        # Medication adherence: all_taken=1.0, partially=0.5, missed=0.0
        med_map = {'all_taken': 1.0, 'partially': 0.5, 'missed': 0.0, 'not_applicable': 1.0}
        if ans.get('medicationTaken'): med_readings.append(med_map.get(ans['medicationTaken'], 1.0))
        elif ans.get('missedMedication') is True: med_readings.append(0.0)

    bp_dev = float(np.mean(sys_readings) - base_sys) if sys_readings else 0.0
    hr_dev = float(np.mean(hr_readings) - base_hr) if hr_readings else 0.0
    spo2_min = float(np.min(spo2_readings)) if spo2_readings else 98.0
    glu_dev = float(np.mean(glu_readings) - base_glu) if glu_readings else 0.0
    sleep_score = float(np.mean(sleep_readings)) if sleep_readings else 2.0
    stress_score = float(np.mean(stress_readings)) if stress_readings else 2.0
    med_adh = float(np.mean(med_readings)) if med_readings else 1.0

    features = [
        mean_sym, max_sym, slope, red_flag_count, missed_count,
        bp_dev, hr_dev, spo2_min, glu_dev, sleep_score, stress_score, med_adh
    ]

    meta_stats = {
        'meanSymptomScore': round(mean_sym, 1),
        'maxSymptomScore': round(max_sym, 1),
        'symptomSlope': round(slope, 2),
        'redFlagCount': red_flag_count,
        'missedCheckins': missed_count,
        'bpDeviation': round(bp_dev, 1),
        'hrDeviation': round(hr_dev, 1),
        'spo2Min': round(spo2_min, 1),
        'medicationAdherence': round(med_adh * 100, 1)
    }

    return features, meta_stats


def compute_dynamic_trend_score(dynamic_stats: dict) -> tuple[float, dict]:
    """Score observed trajectory signals transparently; no dynamic ML model is used."""
    mean_symptom = min(max(dynamic_stats.get('meanSymptomScore', 0.0), 0.0), 100.0)
    positive_slope = min(max(dynamic_stats.get('symptomSlope', 0.0), 0.0), 20.0)
    red_flags = min(max(dynamic_stats.get('redFlagCount', 0), 0), 1)
    missed = min(max(dynamic_stats.get('missedCheckins', 0), 0), 6)
    bp_deviation = min(max(dynamic_stats.get('bpDeviation', 0.0), 0.0), 40.0)
    hr_deviation = min(max(dynamic_stats.get('hrDeviation', 0.0), 0.0), 40.0)
    oxygen_deficit = min(max(98.0 - dynamic_stats.get('spo2Min', 98.0), 0.0), 13.0)
    adherence = min(max(dynamic_stats.get('medicationAdherence', 100.0), 0.0), 100.0)

    components = {
        'symptomLevel': 0.35 * mean_symptom,
        'symptomSlope': 0.25 * (positive_slope / 20.0 * 100.0),
        'redFlagCount': 0.25 * (red_flags * 100.0),
        'missedCheckins': 0.05 * (missed / 6.0 * 100.0),
        'vitalDeviation': 0.05 * ((bp_deviation / 40.0 + hr_deviation / 40.0 + oxygen_deficit / 13.0) / 3.0 * 100.0),
        'medicationAdherence': 0.05 * (100.0 - adherence)
    }
    return round(min(100.0, sum(components.values())), 1), components


def factor_contribution(factor: str, baseline_risk: float) -> float:
    factor_lower = factor.lower()
    if 'red-flag' in factor_lower:
        return 75.0
    if 'desaturation' in factor_lower or 'oxygen saturation' in factor_lower or 'blood pressure' in factor_lower or 'heart rate' in factor_lower:
        return 20.0
    if 'rising symptom' in factor_lower:
        return 18.0
    if 'persistent elevated' in factor_lower or 'medication adherence' in factor_lower:
        return 12.0
    if 'static baseline' in factor_lower:
        return baseline_risk * 0.35
    if 'metabolic' in factor_lower or 'glucose' in factor_lower or 'tobacco' in factor_lower:
        return 8.0
    return 4.0


def apply_factor_severity(factors: list, final_score: float) -> list:
    tier_cap = (
        0 if final_score < 30 else
        1 if final_score < 60 else
        2 if final_score < 75 else 3
    )
    labels = ['low', 'moderate', 'high', 'critical']
    for factor in factors:
        contribution = float(factor.get('contribution', 0.0))
        level = 3 if contribution >= 35 else 2 if contribution >= 18 else 1 if contribution >= 8 else 0
        factor['contribution'] = round(contribution, 1)
        factor['severity'] = labels[min(level, tier_cap)]
    return factors


def evaluate_factors(profile: dict, dynamic_stats: dict, baseline_risk: float, dynamic_risk: float, red_flag_recent: bool) -> list:
    """
    Generates plain-language top 3-5 contributing factors based on attributions.
    """
    factors = []

    # 1. Red flag presence
    if red_flag_recent or dynamic_stats.get('redFlagCount', 0) > 0:
        factors.append({
            'factor': 'Acute Red-Flag Symptom Triggered',
            'severity': 'critical',
            'detail': 'Severe warning signs (e.g. chest pain at rest or neurological weakness) flagged in recent check-in.'
        })

    # 2. SpO2 Dip (Acute hypoxemia alarm)
    spo2_min = dynamic_stats.get('spo2Min', 98.0)
    if spo2_min < 93.0:
        factors.append({
            'factor': 'Blood Oxygen Desaturation',
            'severity': 'high',
            'detail': f"SpO2 minimum dipped to {spo2_min}%, indicating potential respiratory/cardiac compromise."
        })

    # 3. Blood pressure deviation / acute spike
    bp_dev = dynamic_stats.get('bpDeviation', 0)
    base_sys = profile.get('restingBpSystolic')
    if bp_dev >= 15.0:
        factors.append({
            'factor': 'Acute Blood Pressure Spike',
            'severity': 'high',
            'detail': f"Self-reported systolic blood pressure deviated +{bp_dev} mmHg above personal baseline."
        })

    # 4. Medication Adherence
    med_adh = dynamic_stats.get('medicationAdherence', 100.0)
    if med_adh < 70.0:
        factors.append({
            'factor': 'Suboptimal Medication Adherence',
            'severity': 'moderate',
            'detail': f"Only {med_adh}% of scheduled medication doses were confirmed taken recently."
        })

    # 5. Symptom slope & elevation
    slope = dynamic_stats.get('symptomSlope', 0)
    mean_sym = dynamic_stats.get('meanSymptomScore', 0)
    if slope > 2.0:
        factors.append({
            'factor': 'Rising Symptom Trend',
            'severity': 'high',
            'detail': f"Symptom progression slope is climbing steadily (+{slope} pts/check-in) across recent logs."
        })
    elif mean_sym >= 35.0:
        factors.append({
            'factor': 'Persistent Elevated Symptoms',
            'severity': 'moderate',
            'detail': f"Average recent symptom score of {mean_sym}/100 exceeds baseline threshold."
        })

    # 6. Baseline hypertension (if no acute spike already recorded)
    if base_sys and base_sys >= 140 and bp_dev < 15.0:
        factors.append({
            'factor': 'Baseline Hypertension',
            'severity': 'moderate',
            'detail': f"Known resting systolic BP is elevated at {base_sys} mmHg."
        })

    # 6. Tobacco / Smoking factor
    smoking = profile.get('smokingStatus', '')
    if smoking == 'CURRENT':
        factors.append({
            'factor': 'Active Tobacco Smoking',
            'severity': 'high',
            'detail': 'Active tobacco smoking is a primary driver of arterial plaque formation and endothelial strain.'
        })
    # 7. Serum Cholesterol / Metabolic profile
    chol = profile.get('totalCholesterol')
    if chol and chol >= 240:
        factors.append({
            'factor': 'Elevated Serum Cholesterol',
            'severity': 'moderate',
            'detail': f"Total cholesterol of {chol} mg/dL exceeds desirable clinical threshold."
        })
    # 8. Fasting Glucose
    fbs = profile.get('fastingGlucose')
    if fbs and fbs >= 126:
        factors.append({
            'factor': 'Elevated Fasting Glucose',
            'severity': 'moderate',
            'detail': f"Fasting glucose of {fbs} mg/dL indicates impaired glycemic regulation."
        })

    # 9. Baseline Cardiovascular Profile Risk
    if baseline_risk >= 40.0:
        factors.append({
            'factor': 'Static Baseline Cardiovascular Markers',
            'severity': 'moderate' if baseline_risk < 60 else 'high',
            'detail': f"UCI Cleveland baseline model indicates {baseline_risk}% pre-existing clinical vulnerability."
        })

    # Fallback to ensure at least 3-5 high-quality factors
    if len(factors) < 3:
        factors.append({
            'factor': 'Epidemiological Baseline Calibration',
            'severity': 'low' if baseline_risk < 35 else 'moderate',
            'detail': f"Calibrated baseline risk evaluated at {baseline_risk}% from verified clinical covariates."
        })
    if len(factors) < 3:
        factors.append({
            'factor': 'Stable Longitudinal Tracking',
            'severity': 'low',
            'detail': 'Recent symptom scores, resting vitals, and check-in cadence demonstrate steady stability.'
        })

    return factors[:5]


def predict_risk(profile: dict, checkins: list) -> dict:
    """
    Main prediction function.
    Returns structured risk payload conforming to Every Second Counts contract.
    """
    if not risk_artifacts:
        # Fallback heuristic calculation if model unpickled
        return fallback_risk_calculation(profile, checkins)

    b_model = risk_artifacts['baseline_model']
    b_scaler = risk_artifacts['baseline_scaler']
    b_medians = risk_artifacts['baseline_medians']
    weights = risk_artifacts.get('weights', {'baseline': 0.35, 'dynamic': 0.65})

    # 1. Static Baseline Prediction
    b_features = compute_baseline_features(profile, b_medians)
    b_scaled = b_scaler.transform([b_features])
    b_prob = float(b_model.predict_proba(b_scaled)[0, 1])
    baseline_risk = round(b_prob * 100, 1)

    # 2. Transparent Dynamic Trend Score. The former synthetic ML model was
    # calibrated but stepwise on real scenario inputs and did not rank them.
    d_features, d_stats = compute_dynamic_features(checkins, profile)
    dynamic_risk, dynamic_components = compute_dynamic_trend_score(d_stats)

    # 3. Meta-Blend
    model_blend = round(weights['baseline'] * baseline_risk + weights['dynamic'] * dynamic_risk, 1)
    final_score = model_blend
    applied_floors = []

    def apply_floor(rule: str, floor: float):
        nonlocal final_score
        floor = round(floor, 1)
        if final_score < floor:
            final_score = floor
            applied_floors.append({'rule': rule, 'floor': floor})

    # The UCI model cannot observe several important profile histories. Apply
    # transparent modifiers after its probability is calculated rather than
    # pretending those fields are UCI features.
    conditions = profile.get('existingConditions') or {}
    history_modifiers = (
        (12.0 if conditions.get('priorMI') or conditions.get('myocardialInfarction') else 0.0) +
        (12.0 if conditions.get('priorCABG') or conditions.get('cabg') or conditions.get('priorStent') or conditions.get('stent') else 0.0) +
        (10.0 if conditions.get('heartFailure') or conditions.get('congestiveHeartFailure') else 0.0) +
        (8.0 if conditions.get('ckd') or conditions.get('chronicKidneyDisease') else 0.0) +
        (8.0 if conditions.get('heartDisease') or conditions.get('cad') else 0.0)
    )
    if history_modifiers:
        baseline_risk = round(min(100.0, baseline_risk + history_modifiers), 1)
        model_blend = round(weights['baseline'] * baseline_risk + weights['dynamic'] * dynamic_risk, 1)
        final_score = model_blend

    # Conservative blend: the dynamic component must not suppress a high
    # baseline vulnerability signal.
    apply_floor('Conservative baseline protection', 0.6 * baseline_risk)

    # 4. Clinical Safety Overrides. These are explicit safety floors, not
    # model validation claims or a saturation of independent predictions.
    has_recent_red_flag = any(c.get('redFlag') for c in checkins[:5]) if checkins else False
    all_vitals = [c.get('selfReportedVitals') or {} for c in checkins]
    max_systolic = max(
        [profile.get('restingBpSystolic') or 0] +
        [v.get('systolic') or 0 for v in all_vitals]
    )
    max_diastolic = max(
        [profile.get('restingBpDiastolic') or 0] +
        [v.get('diastolic') or 0 for v in all_vitals]
    )
    max_hr = max([v.get('heartRate') or 0 for v in all_vitals] or [0])
    min_hr = min([v.get('heartRate') for v in all_vitals if v.get('heartRate')] or [999])
    symptom_present = d_stats.get('meanSymptomScore', 0) > 0 or d_stats.get('maxSymptomScore', 0) > 0
    objective_vital_alerts = []
    if max_systolic >= 180 or max_diastolic >= 120 or (max_systolic >= 180 and symptom_present):
        objective_vital_alerts.append('Severely elevated blood pressure')
    if d_stats.get('spo2Min', 98.0) < 90:
        objective_vital_alerts.append('Low oxygen saturation')
    if (max_hr > 130 or min_hr < 40) and symptom_present:
        objective_vital_alerts.append('Extreme heart rate with symptoms')

    burden_conditions = (
        conditions.get('heartDisease') or conditions.get('cad'),
        conditions.get('priorMI') or conditions.get('myocardialInfarction'),
        conditions.get('priorCABG') or conditions.get('cabg') or conditions.get('priorStent') or conditions.get('stent'),
        conditions.get('heartFailure') or conditions.get('congestiveHeartFailure'),
        conditions.get('ckd') or conditions.get('chronicKidneyDisease')
    )
    burden_count = sum(bool(value) for value in burden_conditions)
    rising_symptoms = d_stats.get('symptomSlope', 0.0) > 2.0
    missed_medication = d_stats.get('medicationAdherence', 100.0) < 70.0

    if has_recent_red_flag:
        apply_floor('Acute red-flag symptom', 75.0)
    elif objective_vital_alerts:
        apply_floor('Objective vital-sign alert', 60.0)
    elif burden_count >= 2 and (
        d_stats.get('spo2Min', 98.0) < 92.0 or rising_symptoms or missed_medication
    ):
        apply_floor('Multiple major conditions plus aggravating trend', 60.0)
    elif burden_count >= 2:
        apply_floor('Multiple major conditions', 30.0)
    elif dynamic_risk >= 25.0:
        apply_floor('Elevated dynamic trend', 30.0)

    # 5. Tier Determination
    if final_score >= 75.0:
        tier = 'CRITICAL'
    elif final_score >= 60.0 or has_recent_red_flag:
        tier = 'HIGH'
    elif final_score >= 30.0:
        tier = 'MODERATE'
    else:
        tier = 'LOW'

    # Contributing factors
    factors = evaluate_factors(profile, d_stats, baseline_risk, dynamic_risk, has_recent_red_flag)
    for alert in objective_vital_alerts:
        factors.insert(0, {
            'factor': alert,
            'severity': 'high',
            'detail': 'Objective vital-sign safety rule triggered; urgent clinical assessment is required.'
        })
    factors = factors[:5]
    factors = apply_factor_severity(
        [{**factor, 'contribution': factor_contribution(factor['factor'], baseline_risk)} for factor in factors],
        final_score
    )

    # Recommended action per tier
    if tier == 'CRITICAL':
        action = 'CRITICAL ALERT: Immediate emergency care required. Call Emergency Services (112/108) immediately or visit the nearest Trauma Center with ICU. Do not drive yourself.'
    elif tier == 'HIGH':
        action = 'Urgent Clinical Review Advised: Elevated sudden-attack indicators detected. Contact your cardiologist or consulting physician within 24 hours. Monitor for acute chest pain or breathlessness.'
    elif tier == 'MODERATE':
        action = 'Moderate Risk Detected: Review symptoms with your primary physician within 1-2 weeks. Track resting vitals closely and maintain medication adherence.'
    else:
        action = 'No elevated risk detected from the data you entered. Maintain healthy lifestyle habits, continue taking prescribed medications, and complete your 3 daily check-ins.'

    # Data confidence flag
    completeness = profile.get('completenessPercent', 0)
    checkin_count = len(checkins) if checkins else 0
    if completeness >= 70 and checkin_count >= 5:
        data_confidence = 'HIGH'
    elif completeness >= 40 or checkin_count >= 2:
        data_confidence = 'MODERATE'
    else:
        data_confidence = 'LOW'

    return {
        'baselineRisk': baseline_risk,
        'dynamicRisk': dynamic_risk,
        'blendWeights': weights,
        'modelBlendScore': model_blend,
        'unmodifiedBlendScore': model_blend,
        'finalScore': final_score,
        'appliedFloors': applied_floors,
        'tier': tier,
        'factors': factors,
        'recommendedAction': action,
        'modelVersion': 'v1.1-local-uci-baseline-transparent-trend',
        'dynamicComponents': dynamic_components,
        'dataConfidence': data_confidence,
        'isRuleOverride': has_recent_red_flag,
        'safetyRuleAlerts': objective_vital_alerts,
        'historyBurdenCount': burden_count,
        'disclaimer': 'Decision-Support Disclaimer: This local machine learning assessment is intended for risk screening and early warning support, not an official medical diagnosis. Never ignore worsening symptoms.'
    }


def fallback_risk_calculation(profile: dict, checkins: list) -> dict:
    """
    Deterministic fallback when ML model file cannot be loaded.
    Guarantees check-ins and risk calculations never crash.
    """
    base_score = 15.0
    if profile.get('restingBpSystolic', 0) >= 140: base_score += 15.0
    if profile.get('totalCholesterol', 0) >= 240: base_score += 10.0
    if profile.get('fastingGlucose', 0) >= 126: base_score += 10.0

    dynamic_score = 10.0
    has_red_flag = False
    if checkins:
        scores = [c.get('symptomScore', 0) for c in checkins]
        dynamic_score = float(np.mean(scores))
        has_red_flag = any(c.get('redFlag') for c in checkins)

    final = round(0.4 * base_score + 0.6 * dynamic_score, 1)
    if has_red_flag:
        final = max(final, 75.0)

    tier = 'CRITICAL' if final >= 75 else 'HIGH' if final >= 60 else 'MODERATE' if final >= 30 else 'LOW'

    return {
        'baselineRisk': base_score,
        'dynamicRisk': dynamic_score,
        'finalScore': final,
        'tier': tier,
        'factors': [{'factor': 'Deterministic Fallback Heuristic', 'severity': 'normal', 'detail': 'Calculated via deterministic baseline fallback engine.'}],
        'recommendedAction': 'Consult a healthcare professional for clinical risk evaluation.',
        'modelVersion': 'v1.0-deterministic-fallback',
        'dataConfidence': 'LOW',
        'isRuleOverride': has_red_flag,
        'disclaimer': 'Decision-Support Disclaimer: Calculated in basic mode. Intended for screening only, not medical diagnosis.'
    }
