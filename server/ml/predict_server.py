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

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from report_analyzer import analyze_report

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'triage_model.pkl')
FIRST_AID_MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'first_aid_model.pkl')

# ── Load model at startup ───────────────────────────────────────────────────
if not os.path.exists(MODEL_PATH):
    print(f'Model file not found at: {MODEL_PATH}')
    print('   Run train_model.py first.')
    sys.exit(1)

print(f'Loading triage model from: {MODEL_PATH}')
model = joblib.load(MODEL_PATH)
print('Triage model loaded successfully')

first_aid_data = None
if os.path.exists(FIRST_AID_MODEL_PATH):
    try:
        first_aid_data = joblib.load(FIRST_AID_MODEL_PATH)
        print('First-aid intent model loaded successfully')
    except Exception as e:
        print(f'Could not load first aid model: {e}')

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


class ChatIntentRequest(BaseModel):
    message: str

class ChatIntentResponse(BaseModel):
    intent: str
    confidence: float
    reply: str
    isFallback: bool

@app.post('/chat/intent', response_model=ChatIntentResponse)
async def predict_intent(req: ChatIntentRequest):
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail='Message cannot be empty')

    if not first_aid_data:
        # Fallback when model is missing
        return ChatIntentResponse(
            intent='fallback',
            confidence=0.0,
            reply=(
                "I am Every Second Counts Emergency First-Aid Assistant. "
                "For your safety, please contact a healthcare professional or use our SOS button if this is an acute crisis."
            ),
            isFallback=True
        )

    pipeline = first_aid_data['pipeline']
    responses = first_aid_data['responses']
    threshold = first_aid_data.get('confidence_threshold', 0.28)

    probs = pipeline.predict_proba([req.message])[0]
    max_idx = int(np.argmax(probs))
    intent = str(pipeline.classes_[max_idx])
    conf = float(probs[max_idx])

    if conf < threshold:
        return ChatIntentResponse(
            intent=intent,
            confidence=round(conf, 4),
            reply=responses.get('fallback'),
            isFallback=True
        )

    reply_text = responses.get(intent, responses.get('fallback'))
    return ChatIntentResponse(
        intent=intent,
        confidence=round(conf, 4),
        reply=reply_text,
        isFallback=False
    )


@app.post('/analyze-report')
async def analyze_medical_report(
    file: UploadFile = File(...),
    sex: str = Form('unknown'),
    age: Optional[int] = Form(None)
):
    """
    Local Medical Report Analysis Pipeline.
    Extracts text from PDF/image, identifies 50+ lab values, computes severity and category via local ML,
    and returns a plain-language summary with clinical specialist recommendation.
    """
    try:
        content = await file.read()
        res = analyze_report(content, file.filename or 'report', sex=sex, age=age)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report analysis error: {str(e)}")


@app.get('/health')
async def health_check():
    """Health check endpoint."""
    return {
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_classes': list(model.classes_) if hasattr(model, 'classes_') else [],
        'first_aid_model_loaded': first_aid_data is not None,
        'service': 'Every Second Counts AI Triage ML Service',
        'version': '1.0.0'
    }


if __name__ == '__main__':
    import uvicorn
    print('\n🏥 Every Second Counts AI — Starting Triage Prediction Server...')
    uvicorn.run(app, host='0.0.0.0', port=8001, log_level='info')
