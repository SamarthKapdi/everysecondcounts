"""
Every Second Counts — First-Aid Intent Classification Model Training
Trains a TF-IDF + LogisticRegression pipeline to classify emergency first-aid queries into action-oriented intents.
Outputs models/first_aid_model.pkl.
"""

import os
import sys
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import classification_report, accuracy_score

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'first_aid_model.pkl')

DATA = [
    # ── chest_pain ──
    ("chest pain", "chest_pain"),
    ("my chest hurts really bad", "chest_pain"),
    ("sharp pressure in my chest", "chest_pain"),
    ("pain radiating down my left arm and shoulder", "chest_pain"),
    ("crushing chest tightness and sweating", "chest_pain"),
    ("think I'm having a heart attack", "chest_pain"),
    ("heavy elephant sitting on my chest", "chest_pain"),
    ("heart hurts and cannot breathe easily", "chest_pain"),
    ("chest discomfort with nausea and jaw ache", "chest_pain"),
    ("sudden cardiac pain in sternum", "chest_pain"),
    ("angina attack what should I do", "chest_pain"),
    ("stabbing pain in middle of chest", "chest_pain"),
    ("chest pressure and cold sweat", "chest_pain"),
    ("burning pressure in chest spreading to neck", "chest_pain"),

    # ── severe_bleeding ──
    ("severe bleeding", "severe_bleeding"),
    ("deep cut on wrist bleeding heavily", "severe_bleeding"),
    ("blood is spurting from arm wound", "severe_bleeding"),
    ("how to stop bleeding from deep laceration", "severe_bleeding"),
    ("bleeding will not stop after 10 minutes", "severe_bleeding"),
    ("puncture wound bleeding profusely", "severe_bleeding"),
    ("cut my leg with glass losing lot of blood", "severe_bleeding"),
    ("heavy hemorrhage from injury", "severe_bleeding"),
    ("applying pressure but blood soaking through towel", "severe_bleeding"),
    ("arterial bleed how to control", "severe_bleeding"),
    ("stab cut bleeding uncontrolled", "severe_bleeding"),
    ("head laceration bleeding everywhere", "severe_bleeding"),

    # ── burns ──
    ("burns", "burns"),
    ("burned my hand on hot pan", "burns"),
    ("scalded arm with boiling water", "burns"),
    ("hot oil splashed on face and hand", "burns"),
    ("severe second degree burn with blisters", "burns"),
    ("chemical burn on skin", "burns"),
    ("fire burn treatment first aid", "burns"),
    ("child touched hot stove element", "burns"),
    ("skin peeling from bad steam burn", "burns"),
    ("what to put on a fresh burn", "burns"),
    ("third degree burn charred white skin", "burns"),
    ("hot tea spilled on leg burning badly", "burns"),

    # ── choking ──
    ("choking", "choking"),
    ("someone is choking on food", "choking"),
    ("person cannot breathe food stuck in throat", "choking"),
    ("child is choking and turning blue", "choking"),
    ("how to perform heimlich maneuver", "choking"),
    ("throat blocked cannot cough or speak", "choking"),
    ("foreign object lodged in trachea airway", "choking"),
    ("adult choking giving abdominal thrusts", "choking"),
    ("silent choking holding neck with both hands", "choking"),
    ("swallowed coin choking unable to breathe", "choking"),

    # ── stroke ──
    ("stroke", "stroke"),
    ("face is drooping on one side", "stroke"),
    ("sudden weakness in right arm and leg", "stroke"),
    ("cannot speak words are slurred and confused", "stroke"),
    ("FAST stroke symptoms check", "stroke"),
    ("mother cannot lift her left arm or smile properly", "stroke"),
    ("sudden loss of vision and balance one sided paralysis", "stroke"),
    ("transient ischemic attack warning signs", "stroke"),
    ("one side of face completely numb and droopy", "stroke"),
    ("sudden severe thunderclap headache with confusion", "stroke"),

    # ── fracture ──
    ("fracture", "fracture"),
    ("broken bone in leg", "fracture"),
    ("fell down stairs and heard bone snap", "fracture"),
    ("arm is bent at unnatural angle", "fracture"),
    ("bone poking through skin compound fracture", "fracture"),
    ("severe wrist pain cannot move hand swollen", "fracture"),
    ("suspected fractured clavicle collarbone", "fracture"),
    ("splinting broken ankle first aid", "fracture"),
    ("fell skateboarding heard loud crack in tibia", "fracture"),
    ("dislocated shoulder or broken bone intense agony", "fracture"),

    # ── fever ──
    ("fever", "fever"),
    ("high fever 104 degrees", "fever"),
    ("child has burning fever and shivering", "fever"),
    ("how to reduce high temperature safely", "fever"),
    ("fever chills body aches and fatigue", "fever"),
    ("baby has 102 fever what should I do", "fever"),
    ("persistent fever for three days with headache", "fever"),
    ("burning forehead sweating and feverish", "fever"),
    ("sponge bath for fever adults and kids", "fever"),
    ("spiking high fever with weakness", "fever"),

    # ── allergic_reaction ──
    ("allergic reaction", "allergic_reaction"),
    ("anaphylaxis throat is swelling shut", "allergic_reaction"),
    ("stung by bee hives spreading face swollen", "allergic_reaction"),
    ("ate peanuts having severe allergic attack", "allergic_reaction"),
    ("lips tongue swelling cannot breathe allergy", "allergic_reaction"),
    ("how to use epipen auto injector", "allergic_reaction"),
    ("severe rash itching swelling after medication", "allergic_reaction"),
    ("anaphylactic shock symptoms urgent", "allergic_reaction"),
    ("wheezing hives facial edema after food", "allergic_reaction"),

    # ── seizure ──
    ("seizure", "seizure"),
    ("person is having a seizure convulsing", "seizure"),
    ("epileptic fit shaking violently on floor", "seizure"),
    ("how to help someone during a seizure", "seizure"),
    ("grand mal seizure foaming at mouth", "seizure"),
    ("unconscious body jerking uncontrollably", "seizure"),
    ("seizure lasted more than 5 minutes", "seizure"),
    ("child having febrile seizure high temp", "seizure"),

    # ── poisoning ──
    ("poisoning", "poisoning"),
    ("child drank cleaning detergent bleach", "poisoning"),
    ("accidental medication overdose pills", "poisoning"),
    ("ingested chemical poison what to do", "poisoning"),
    ("inhaled toxic fumes feeling dizzy vomiting", "poisoning"),
    ("swallowed battery or poisonous plant", "poisoning"),
    ("should I induce vomiting for poison", "poisoning"),

    # ── cpr_unresponsive ──
    ("person not breathing unconscious", "cpr_unresponsive"),
    ("no pulse not breathing how to do cpr", "cpr_unresponsive"),
    ("collapsed unresponsive cannot wake them up", "cpr_unresponsive"),
    ("cardiac arrest cpr chest compressions depth and rate", "cpr_unresponsive"),
    ("found someone passed out with no breath", "cpr_unresponsive"),

    # ── greeting / general ──
    ("hello", "greeting"),
    ("hi there", "greeting"),
    ("good morning", "greeting"),
    ("who are you", "greeting"),
    ("what can you do", "greeting"),
    ("help me please", "greeting"),
]

RESPONSES = {
    "chest_pain": (
        "🚨 CRITICAL EMERGENCY (CARDIAC): "
        "1. Call Emergency Services (112 / 108) or tap the red SOS button immediately. "
        "2. Have the person sit quietly and rest in a semi-upright position. "
        "3. Chew an uncoated aspirin (325mg) if available and not allergic. "
        "4. Loosen tight clothing around neck and chest. If unresponsive and not breathing, begin CPR immediately."
    ),
    "severe_bleeding": (
        "🩸 FIRST AID FOR SEVERE BLEEDING: "
        "1. Apply firm, continuous, direct pressure over the wound using a clean cloth or sterile dressing. "
        "2. Elevate the injured area above heart level if no fracture is present. "
        "3. Do NOT remove soaked bandages—add more layers on top. "
        "4. If blood is spurting or won't stop after 5-10 minutes, seek emergency medical care immediately."
    ),
    "burns": (
        "🔥 FIRST AID FOR BURNS: "
        "1. Cool the burn immediately under cool, gentle running tap water for 10-20 minutes. "
        "2. Never use ice, butter, toothpaste, or greasy ointments. "
        "3. Cover loosely with sterile, non-stick dressing or clean cling wrap. "
        "4. Seek emergency hospital care if the burn is larger than 3 inches, blistered, on face/hands, or appears charred white/dark."
    ),
    "choking": (
        "🗣️ FIRST AID FOR CHOKING (CONSCIOUS ADULT/CHILD): "
        "1. Ask 'Are you choking? Can you speak?' If they can cough forcefully, encourage them to keep coughing. "
        "2. Give 5 sharp back blows between the shoulder blades with the heel of your hand. "
        "3. If unresolved, give 5 abdominal thrusts (Heimlich Maneuver): place fist above navel, grasp with other hand, thrust inward and upward. "
        "4. If person becomes unconscious, lower to floor, call 112/108, and begin chest compressions."
    ),
    "stroke": (
        "🧠 STROKE ALERT (ACT F.A.S.T.): "
        "1. Face: Ask them to smile. Does one side droop? "
        "2. Arms: Ask them to raise both arms. Does one drift downward? "
        "3. Speech: Ask them to repeat a simple sentence. Is speech slurred or strange? "
        "4. Time: If ANY sign is present, call Emergency Services (112/108) immediately! Note the exact time symptoms began. Do not give aspirin, food, or water."
    ),
    "fracture": (
        "🦴 FIRST AID FOR FRACTURES: "
        "1. Keep the injured limb completely still. Do NOT try to realign or push protruding bone back. "
        "2. Apply ice wrapped in a towel for up to 15 minutes to reduce swelling. "
        "3. Support or splint the limb in the position found without forcing movement. "
        "4. Transport to the nearest emergency trauma center immediately, or call an ambulance if the bone is exposed or spine/neck is injured."
    ),
    "fever": (
        "🌡️ FIRST AID FOR HIGH FEVER: "
        "1. Rest in a cool, ventilated room and maintain hydration with clean water and ORS. "
        "2. Sponge forehead, neck, and armpits with lukewarm (not cold) water. "
        "3. Wear lightweight clothing and avoid heavy blankets. "
        "4. Seek immediate emergency care if fever exceeds 40°C (104°F), or if accompanied by stiff neck, confusion, breathing difficulty, or seizures."
    ),
    "allergic_reaction": (
        "⚠️ FIRST AID FOR SEVERE ALLERGY (ANAPHYLAXIS): "
        "1. If patient has an epinephrine auto-injector (EpiPen), administer into outer mid-thigh immediately. "
        "2. Call 112/108 or tap SOS immediately. "
        "3. Keep person lying flat with feet elevated (or seated upright if breathing is difficult). "
        "4. Do not offer oral medicines if throat is closing. Prepare for a second dose if no improvement in 5-10 minutes."
    ),
    "seizure": (
        "⚡ FIRST AID FOR SEIZURES: "
        "1. Ease the person to the floor and clear hard or sharp objects away. "
        "2. Turn them gently onto their side (recovery position) to keep airway clear. "
        "3. Put something soft under their head and loosen tight clothing around neck. "
        "4. NEVER place objects in their mouth or restrain them. Call 112/108 if seizure lasts >5 minutes or repeats."
    ),
    "poisoning": (
        "🧪 FIRST AID FOR POISONING / OVERDOSE: "
        "1. Call Emergency Services (112/108) or Poison Control immediately. "
        "2. Have the chemical container or pill bottle ready to describe contents. "
        "3. Do NOT induce vomiting unless explicitly directed by a poison control physician. "
        "4. If inhaled, move into fresh air. If on skin or eyes, flush with running water for 15 minutes."
    ),
    "cpr_unresponsive": (
        "🫀 CPR EMERGENCY (UNRESPONSIVE & NOT BREATHING): "
        "1. Call 112/108 and tap the SOS button immediately. "
        "2. Place heel of hand in center of chest, other hand on top with interlocked fingers. "
        "3. Push hard and fast: 100-120 compressions/minute, at least 2 inches (5 cm) deep. Allow full chest recoil. "
        "4. Continue uninterrupted until emergency medical responders arrive."
    ),
    "greeting": (
        "Hello! I am Every Second Counts Local First-Aid Assistant. "
        "I can provide immediate first-aid instructions for emergencies (burns, bleeding, choking, chest pain, fractures, allergic reactions, seizures). "
        "How can I help you right now? If this is an emergency, please use our SOS button."
    ),
    "fallback": (
        "I'm not sure about that specific condition. For your safety, please contact a healthcare professional, "
        "use our AI Symptom Checker for structured triage, or tap the Emergency SOS button if you are experiencing an acute medical crisis."
    )
}

def train():
    texts, labels = zip(*DATA)
    texts = list(texts)
    labels = list(labels)

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), max_features=1000, sublinear_tf=True, lowercase=True)),
        ('clf', LogisticRegression(C=10.0, max_iter=1000, random_state=42))
    ])

    pipeline.fit(texts, labels)

    os.makedirs(MODEL_DIR, exist_ok=True)
    payload = {
        'pipeline': pipeline,
        'responses': RESPONSES,
        'intents': sorted(list(set(labels))),
        'confidence_threshold': 0.28
    }
    joblib.dump(payload, MODEL_PATH)
    print(f"✅ First-aid intent model saved to: {MODEL_PATH}")
    print(f"   Classes: {len(payload['intents'])} | Training samples: {len(texts)}")

    # Quick verification
    test_queries = [
        "I have heavy bleeding on my arm",
        "chest pain radiating to shoulder",
        "burned fingers with hot oil",
        "someone is choking on a grape",
        "face drooping and slurred speech",
        "what is the weather in Paris today"
    ]
    print("\n🔍 Verification Predictions:")
    for q in test_queries:
        probs = pipeline.predict_proba([q])[0]
        max_idx = np.argmax(probs)
        intent = pipeline.classes_[max_idx]
        conf = probs[max_idx]
        if conf < payload['confidence_threshold']:
            reply_key = 'fallback'
        else:
            reply_key = intent
        print(f"  Q: '{q}' -> Intent: {intent} ({conf:.2%}) -> Response key: {reply_key}")

if __name__ == '__main__':
    train()
