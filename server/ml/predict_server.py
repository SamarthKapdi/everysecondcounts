"""
Every Second Counts AI — Local ML Triage Prediction Server

FastAPI microservice that serves the trained TF-IDF + SVM triage model.
Runs on localhost:8001 — called by the Node.js backend's aiService.js
as Tier 2 of the hybrid triage engine.

Usage:
    uvicorn predict_server:app --host 0.0.0.0 --port 8001

Endpoints:
    POST /predict  — Classify symptoms into triage severity
    GET  /health   — Health check
"""

import os
import sys
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'triage_model.pkl')

# ── Load model at startup ───────────────────────────────────────────────────
if not os.path.exists(MODEL_PATH):
    print(f'❌ Model file not found at: {MODEL_PATH}')
    print('   Run train_model.py first.')
    sys.exit(1)

print(f'🔧 Loading triage model from: {MODEL_PATH}')
model = joblib.load(MODEL_PATH)
print('✅ Model loaded successfully')

# ── Severity metadata ───────────────────────────────────────────────────────
SEVERITY_META = {
    'GREEN': {
        'description': 'Minor / self-limiting condition',
        'action': 'Home care recommended. Over-the-counter medications as appropriate. Seek medical attention if symptoms worsen or persist beyond 48 hours.'
    },
    'YELLOW': {
        'description': 'Moderate condition requiring medical evaluation',
        'action': 'Schedule urgent care visit within 2-4 hours. Self-transport recommended unless condition worsens. Monitor for danger signs.'
    },
    'ORANGE': {
        'description': 'Urgent condition requiring rapid medical evaluation',
        'action': 'Visit nearest Emergency Room immediately. Dispatch Standard Ambulance if needed. Prioritize evaluation within 30 minutes.'
    },
    'RED': {
        'description': 'Life-threatening emergency requiring immediate intervention',
        'action': 'Call Emergency Services (112/108) immediately. Dispatch Advanced Life Support (ALS) Ambulance. Route to nearest Trauma Center with ICU.'
    }
}

# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title='Every Second Counts AI Triage Prediction Service',
    description='Local ML model for emergency symptom triage classification',
    version='1.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # Localhost only in production
    allow_methods=['*'],
    allow_headers=['*'],
)


class PredictRequest(BaseModel):
    symptoms: List[str]


class PredictResponse(BaseModel):
    severity: str
    confidenceScore: float
    reasoning: str
    recommendedAction: str
    isRuleOverride: bool = False
    triageEngine: str = 'Every Second Counts ML Classifier v1.0 (TF-IDF + SVM)'
    classProbabilities: dict = {}


@app.post('/predict', response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Classify symptoms into a triage severity level.

    Accepts an array of symptom strings, joins them, and runs through
    the trained TF-IDF + LinearSVC pipeline.
    """
    if not request.symptoms or len(request.symptoms) == 0:
        raise HTTPException(status_code=400, detail='No symptoms provided')

    # Join symptoms into a single text string (same format as training data)
    symptom_text = ', '.join(request.symptoms)

    try:
        # Predict severity class
        prediction = model.predict([symptom_text])[0]

        # Get probability estimates (from CalibratedClassifierCV)
        probabilities = model.predict_proba([symptom_text])[0]
        classes = model.classes_
        confidence = float(max(probabilities))

        # Build class probability map
        class_probs = {
            cls: round(float(prob), 4)
            for cls, prob in zip(classes, probabilities)
        }

        meta = SEVERITY_META.get(prediction, SEVERITY_META['YELLOW'])

        # Generate reasoning
        reasoning = (
            f"ML Model Classification: Based on analysis of symptom features "
            f"'{symptom_text}', the trained TF-IDF + SVM classifier predicts "
            f"{prediction} severity with {confidence:.0%} confidence. "
            f"{meta['description']}."
        )

        return PredictResponse(
            severity=prediction,
            confidenceScore=round(confidence, 4),
            reasoning=reasoning,
            recommendedAction=meta['action'],
            isRuleOverride=False,
            classProbabilities=class_probs
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f'Prediction error: {str(e)}'
        )


@app.get('/health')
async def health_check():
    """Health check endpoint."""
    return {
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_classes': list(model.classes_) if hasattr(model, 'classes_') else [],
        'service': 'Every Second Counts AI Triage ML Service',
        'version': '1.0.0'
    }


if __name__ == '__main__':
    import uvicorn
    print('\n🏥 Every Second Counts AI — Starting Triage Prediction Server...')
    uvicorn.run(app, host='0.0.0.0', port=8001, log_level='info')
