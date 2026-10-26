"""
Phase 6 ML Unit Tests:
- Triage model emergency phrase classification & confidence
- First-aid intent classifier queries & safe responses
- Report analyzer extraction, reference ranges, and abnormal flags
- Risk model bounds [0, 100], tiers, >= 3 factors, red-flag override
- Calibration check: test probabilities across synthetic population
"""

import os
import sys
import joblib
import numpy as np
import pytest

# Ensure server/ml is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from report_analyzer import analyze_report, LAB_DICTIONARY
from risk_engine import predict_risk, compute_baseline_features, compute_dynamic_features


@pytest.fixture(scope="session")
def triage_model():
    model_path = os.path.join(ML_DIR, 'models', 'triage_model.pkl')
    assert os.path.exists(model_path), f"triage_model.pkl not found at {model_path}"
    return joblib.load(model_path)


@pytest.fixture(scope="session")
def first_aid_bundle():
    model_path = os.path.join(ML_DIR, 'models', 'first_aid_model.pkl')
    assert os.path.exists(model_path), f"first_aid_model.pkl not found at {model_path}"
    return joblib.load(model_path)


@pytest.fixture(scope="session")
def risk_bundle():
    model_path = os.path.join(ML_DIR, 'models', 'risk_model.pkl')
    assert os.path.exists(model_path), f"risk_model.pkl not found at {model_path}"
    return joblib.load(model_path)


# ── 1. Triage Model Tests ───────────────────────────────────────────────────

def test_triage_model_predicts_emergency_phrases(triage_model):
    """Verify high severity and confident predictions on acute emergency presentations."""
    emergency_phrases = [
        "severe crushing chest pain radiating to left arm and jaw, profuse cold sweating",
        "unconscious patient head injury heavy arterial bleeding after motorcycle collision",
        "child choking blue cyanotic lips completely unable to breathe or speak"
    ]

    for phrase in emergency_phrases:
        pred = triage_model.predict([phrase])[0]
        probs = triage_model.predict_proba([phrase])[0]
        max_prob = max(probs)

        # Must predict high priority (RED or ORANGE)
        assert pred in ['RED', 'ORANGE'], f"Expected RED or ORANGE for emergency, got {pred} on '{phrase}'"
        assert max_prob >= 0.35, f"Confidence too low ({max_prob}) on emergency phrase"

    # Mild condition should NOT be RED
    mild_phrase = "mild itchy runny nose sneezing slightly for two hours"
    mild_pred = triage_model.predict([mild_phrase])[0]
    assert mild_pred in ['GREEN', 'YELLOW'], f"Expected mild tier, got {mild_pred}"


# ── 2. First-Aid Intent Classifier Tests ────────────────────────────────────

def test_first_aid_intent_classifier_mappings(first_aid_bundle):
    """Verify intent mapping for critical first-aid queries."""
    model = first_aid_bundle['pipeline']
    responses = first_aid_bundle.get('responses', {})

    test_queries = [
        ("how to stop arterial spurting blood from a severe knife cut", ["bleeding", "severe_bleeding"]),
        ("hot boiling oil spilled on my arm causing large painful blisters", "burns"),
        ("toddler swallowed a coin and is choking clutching throat cannot speak", "choking"),
        ("sudden face drooping on right side and slurred speech", "stroke"),
        ("chest pressure feeling like an elephant sitting on my chest", "chest_pain"),
        ("high temperature 103 fever and shivering chills", "fever"),
        ("bee sting swelling on lips and difficulty swallowing", "allergic_reaction")
    ]

    for query, expected_intent in test_queries:
        probs = model.predict_proba([query])[0]
        pred_idx = np.argmax(probs)
        pred_intent = model.classes_[pred_idx]
        confidence = probs[pred_idx]

        if isinstance(expected_intent, list):
            assert pred_intent in expected_intent, f"Query '{query}' predicted {pred_intent}, expected one of {expected_intent}"
        else:
            assert pred_intent == expected_intent, f"Query '{query}' predicted {pred_intent}, expected {expected_intent}"
        assert confidence >= 0.25, f"Confidence too low ({confidence}) for query '{query}'"

        # Ensure a templated safe first-aid response exists for the predicted intent
        assert pred_intent in responses, f"No templated safe response for intent {pred_intent}"
        reply = responses[pred_intent]
        assert len(reply) > 20, "Response is too short or empty"
        assert "safe" not in reply.lower() or "not safe" in reply.lower() or "ensure you are in a safe" in reply.lower()


# ── 3. Report Analyzer Tests ────────────────────────────────────────────────

def test_report_analyzer_extracts_values_and_flags_abnormals():
    """Verify laboratory value regex extraction and reference range flagging on synthetic lab report text."""
    sample_report_text = """
    METROPOLIS CLINICAL DIAGNOSTIC LABORATORY
    Patient: Ramesh Kumar | Age: 54 | Sex: Male
    Ref By: Dr. A. Sharma | Date: 2026-10-25

    COMPLETE BLOOD COUNT & METABOLIC PANEL
    Hemoglobin (Hb): 7.8 g/dL              (Reference: 13.0 - 17.0)
    Fasting Blood Glucose: 228 mg/dL       (Reference: 70 - 99)
    Total Serum Cholesterol: 275 mg/dL     (Reference: 125 - 200)
    Serum Creatinine: 2.4 mg/dL            (Reference: 0.7 - 1.3)
    Platelet Count: 85,000 /mcL            (Reference: 150,000 - 450,000)
    Troponin I: 0.95 ng/mL                 (Reference: 0.0 - 0.04)
    """

    res = analyze_report(text_content=sample_report_text, filename="test_cbc_metabolic.txt")

    assert res['success'] is True
    labs = res['extractedLabValues']
    assert len(labs) >= 5, f"Expected at least 5 extracted labs, got {len(labs)}"

    # Check specific abnormal flags
    lab_map = {l['name']: l for l in labs}

    # Hemoglobin 7.8 should be low or critical
    assert 'Hemoglobin' in lab_map
    assert lab_map['Hemoglobin']['status'] in ['low', 'critical']
    assert abs(lab_map['Hemoglobin']['value'] - 7.8) < 0.1

    # Fasting Blood Glucose 228 should be high or critical
    assert 'Fasting Blood Glucose' in lab_map
    assert lab_map['Fasting Blood Glucose']['status'] in ['high', 'critical']

    # Total Cholesterol 275 should be high or critical
    assert 'Total Cholesterol' in lab_map
    assert lab_map['Total Cholesterol']['status'] in ['high', 'critical']

    # Cardiac Troponin I 0.95 should be critical
    assert 'Cardiac Troponin I' in lab_map
    assert lab_map['Cardiac Troponin I']['status'] in ['high', 'critical']

    # Serum Creatinine 2.4 should be high
    assert 'Serum Creatinine' in lab_map
    assert lab_map['Serum Creatinine']['status'] in ['high', 'critical']

    # Check report severity
    assert res['severity'] in ['URGENT', 'CONSULT_SOON']
    assert res['abnormalCount'] >= 4
    critical_items = [l for l in labs if l['status'] == 'critical']
    assert len(critical_items) >= 1


# ── 4. Risk Prediction Model Tests ──────────────────────────────────────────

def test_risk_model_outputs_bounds_and_factors():
    """Verify score is bounded [0, 100], tier is valid, and >= 3 factors are returned."""
    profile = {
        'dateOfBirth': '1968-08-14',
        'sex': 'MALE',
        'restingBpSystolic': 155,
        'restingBpDiastolic': 96,
        'restingHeartRate': 88,
        'totalCholesterol': 260,
        'fastingGlucose': 140,
        'smokingStatus': 'CURRENT',
        'existingConditions': {'hypertension': True},
        'completenessPercent': 85
    }

    checkins = [
        {'symptomScore': 20, 'redFlag': False, 'date': '2026-10-23'},
        {'symptomScore': 35, 'redFlag': False, 'date': '2026-10-24'},
        {'symptomScore': 52, 'redFlag': False, 'date': '2026-10-25'}
    ]

    result = predict_risk(profile, checkins)

    # 1. Score bounds
    assert 0 <= result['finalScore'] <= 100, f"Score out of bounds: {result['finalScore']}"
    assert 0 <= result['baselineRisk'] <= 100
    assert 0 <= result['dynamicRisk'] <= 100

    # 2. Valid Tier
    assert result['tier'] in ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']

    # 3. Contributing factors count and structure
    factors = result['factors']
    assert len(factors) >= 3, f"Expected >= 3 factors, got {len(factors)}"
    for f in factors:
        assert 'factor' in f
        assert 'severity' in f
        assert f['severity'] in ['low', 'moderate', 'high', 'critical']
        assert 'detail' in f
        assert len(f['detail']) > 10


def test_risk_model_red_flag_hard_override():
    """Verify that any red-flag check-in forces score >= 75 and tier >= HIGH."""
    young_profile = {
        'dateOfBirth': '1998-05-12',
        'sex': 'FEMALE',
        'restingBpSystolic': 110,
        'restingBpDiastolic': 70,
        'totalCholesterol': 160,
        'smokingStatus': 'NEVER',
        'completenessPercent': 90
    }

    acute_checkins = [
        {'symptomScore': 10, 'redFlag': False, 'date': '2026-10-25'},
        {'symptomScore': 80, 'redFlag': True, 'date': '2026-10-26'}
    ]

    result = predict_risk(young_profile, acute_checkins)

    assert result['isRuleOverride'] is True
    assert result['finalScore'] >= 75.0, f"Score should be >= 75 on red flag, got {result['finalScore']}"
    assert result['tier'] in ['HIGH', 'CRITICAL'], f"Tier should be HIGH or CRITICAL, got {result['tier']}"


# ── 5. Probability Calibration & Distribution Tests ─────────────────────────

def test_probability_calibration_and_distribution(risk_bundle):
    """Verify baseline model probabilities are reasonably distributed across population gradient."""
    baseline_clf = risk_bundle['baseline_model']
    scaler = risk_bundle['baseline_scaler']

    # Synthetic patient cohorts spanning healthy to high cardiovascular risk
    cohort = [
        # Healthy cohort: young, low BP, low cholesterol, normal ECG
        [25, 0, 1, 105, 160, 0, 0, 180, 0, 0.0, 1, 0, 3],
        [32, 1, 1, 115, 175, 0, 0, 170, 0, 0.2, 1, 0, 3],
        [40, 0, 2, 120, 190, 0, 0, 160, 0, 0.4, 1, 0, 3],
        # Moderate cohort: mid-age, stage 1 hypertension, elevated lipids
        [50, 1, 3, 138, 225, 0, 1, 145, 0, 1.0, 2, 0, 3],
        [58, 1, 3, 148, 245, 1, 1, 135, 1, 1.4, 2, 1, 6],
        # High risk cohort: elderly, stage 2 hypertension, severe ischemia, major vessels colored
        [65, 1, 4, 165, 275, 1, 2, 120, 1, 2.2, 2, 2, 7],
        [72, 1, 4, 180, 310, 1, 2, 105, 1, 3.0, 2, 3, 7]
    ]

    probabilities = np.array([
        float(baseline_clf.predict_proba(scaler.transform([p]))[0, 1])
        for p in cohort
    ])

    # Probabilities should NOT collapse to a single constant or extreme binary 0/1
    assert probabilities.min() < 0.20, f"Expected low end probabilities < 0.20, got min {probabilities.min():.3f}"
    assert probabilities.max() > 0.65, f"Expected high end probabilities > 0.65, got max {probabilities.max():.3f}"
    assert np.std(probabilities) > 0.15, "Probability distribution lacks adequate variance across demographic gradient"
    # General positive trend with cardiovascular strain
    assert probabilities[-1] > probabilities[0], "Probabilities must increase as cardiovascular strain escalates"

