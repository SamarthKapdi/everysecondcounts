"""
Every Second Counts — Symptom-Severity Training Dataset Generator

Synthesizes a training dataset that maps symptom text descriptions to
emergency triage severity levels (GREEN / YELLOW / ORANGE / RED).

Based on the Kaggle "Disease Symptom Description Dataset" (itachi9604) mapping
of per-symptom severity weights (1-7) to our 4-class triage scale.

Weight Mapping:
  1-2 → GREEN  (self-care / minor)
  3-4 → YELLOW (needs medical attention, non-urgent)
  5-6 → ORANGE (urgent, rapid evaluation needed)
  7   → RED    (life-threatening, immediate intervention)
"""

import pandas as pd
import random
import os

random.seed(42)

# ── Symptom database with severity weights (1-7 scale from Kaggle dataset) ──
SYMPTOM_DB = {
    # Weight 1-2: GREEN — minor / self-limiting
    'mild headache': 1, 'runny nose': 1, 'sneezing': 1, 'mild cough': 1,
    'common cold': 1, 'mild fatigue': 2, 'slight sore throat': 1,
    'mild body ache': 2, 'watery eyes': 1, 'mild itching': 1,
    'dry skin': 1, 'minor rash': 2, 'stuffy nose': 1, 'mild nausea': 2,
    'mild stomach discomfort': 2, 'insomnia': 2, 'mild anxiety': 2,
    'chapped lips': 1, 'minor bruise': 1, 'paper cut': 1,
    'mild sunburn': 2, 'hiccups': 1, 'mild bloating': 2,
    'muscle soreness after exercise': 2, 'mild acne': 1,
    'dandruff': 1, 'minor mouth ulcer': 2, 'mild constipation': 2,
    'occasional heartburn': 2, 'mild allergies': 2,

    # Weight 3-4: YELLOW — needs medical attention
    'persistent headache': 3, 'fever': 4, 'high fever': 4,
    'persistent cough': 3, 'sore throat with fever': 4,
    'vomiting': 4, 'diarrhea': 3, 'ear pain': 3,
    'eye pain': 3, 'joint pain': 3, 'back pain': 3,
    'abdominal pain': 4, 'dizziness': 4, 'nausea and vomiting': 4,
    'skin infection': 3, 'urinary burning': 4, 'blood in urine': 4,
    'swollen lymph nodes': 3, 'persistent fatigue': 3,
    'weight loss unintentional': 4, 'night sweats': 4,
    'muscle cramps': 3, 'numbness in fingers': 3,
    'blurred vision': 4, 'chest tightness': 4, 'wheezing': 4,
    'ankle swelling': 3, 'jaundice': 4, 'painful urination': 3,
    'chronic indigestion': 3, 'frequent urination': 3,
    'skin rash with fever': 4, 'migraine': 4,
    'toothache severe': 3, 'sprained ankle': 3,
    'minor fracture pain': 4, 'dehydration': 4,

    # Weight 5-6: ORANGE — urgent, needs rapid evaluation
    'difficulty breathing': 6, 'shortness of breath': 6,
    'severe pain': 5, 'severe abdominal pain': 6,
    'vomiting blood': 6, 'head injury': 6, 'confusion': 5,
    'sudden weakness': 5, 'high fever with chills': 5,
    'severe headache': 5, 'loss of consciousness brief': 6,
    'severe allergic reaction': 6, 'severe burn': 6,
    'poisoning suspected': 6, 'drug overdose suspected': 6,
    'severe chest tightness': 6, 'numbness one side': 6,
    'difficulty speaking suddenly': 6, 'severe dehydration': 5,
    'blood in stool': 5, 'severe back pain radiating': 5,
    'coughing blood': 6, 'facial drooping': 6,
    'severe infection signs': 5, 'open wound deep': 5,
    'eye injury': 5, 'severe asthma attack': 6,
    'diabetic emergency': 6, 'seizure single': 5,
    'severe nosebleed': 5, 'broken bone visible': 6,
    'animal bite deep': 5, 'chemical exposure': 6,

    # Weight 7: RED — life-threatening
    'chest pain': 7, 'unconscious': 7, 'not breathing': 7,
    'severe bleeding uncontrolled': 7, 'seizure continuous': 7,
    'stroke symptoms': 7, 'heart attack symptoms': 7,
    'blue lips': 7, 'choking': 7, 'cardiac arrest': 7,
    'anaphylaxis': 7, 'drowning': 7, 'electrocution': 7,
    'gunshot wound': 7, 'stab wound': 7, 'severe trauma': 7,
    'loss of consciousness prolonged': 7, 'no pulse detected': 7,
    'massive hemorrhage': 7, 'severe head trauma': 7,
    'spinal injury suspected': 7, 'multi organ failure signs': 7,
    'septic shock symptoms': 7, 'tension pneumothorax': 7,
}

def weight_to_severity(weight):
    """Map symptom weight (1-7) to triage severity."""
    if weight <= 2:
        return 'GREEN'
    elif weight <= 4:
        return 'YELLOW'
    elif weight <= 6:
        return 'ORANGE'
    else:
        return 'RED'


def generate_dataset(n_samples=3000):
    """
    Generate a training dataset by creating symptom combinations
    with varying lengths and assigning severity based on the
    maximum symptom weight in each combination.
    """
    rows = []
    symptom_list = list(SYMPTOM_DB.keys())

    severity_groups = {
        'GREEN':  [s for s, w in SYMPTOM_DB.items() if weight_to_severity(w) == 'GREEN'],
        'YELLOW': [s for s, w in SYMPTOM_DB.items() if weight_to_severity(w) == 'YELLOW'],
        'ORANGE': [s for s, w in SYMPTOM_DB.items() if weight_to_severity(w) == 'ORANGE'],
        'RED':    [s for s, w in SYMPTOM_DB.items() if weight_to_severity(w) == 'RED'],
    }

    target_per_class = n_samples // 4

    for target_severity in ['GREEN', 'YELLOW', 'ORANGE', 'RED']:
        count = 0
        while count < target_per_class:
            # Always include at least one symptom from the target class
            num_primary = random.randint(1, min(3, len(severity_groups[target_severity])))
            primary_symptoms = random.sample(severity_groups[target_severity], num_primary)

            # Optionally add lower-severity symptoms for realism
            extra_symptoms = []
            if random.random() > 0.3:
                lower_classes = {
                    'GREEN': [],
                    'YELLOW': ['GREEN'],
                    'ORANGE': ['GREEN', 'YELLOW'],
                    'RED': ['GREEN', 'YELLOW', 'ORANGE'],
                }
                lower_pool = []
                for lc in lower_classes[target_severity]:
                    lower_pool.extend(severity_groups[lc])
                if lower_pool:
                    num_extra = random.randint(1, min(3, len(lower_pool)))
                    extra_symptoms = random.sample(lower_pool, num_extra)

            all_symptoms = primary_symptoms + extra_symptoms
            random.shuffle(all_symptoms)

            # The max weight determines the overall severity
            max_weight = max(SYMPTOM_DB[s] for s in all_symptoms)
            severity = weight_to_severity(max_weight)

            # Should match our target (it always will since primary is from target class)
            assert severity == target_severity, f"Mismatch: {severity} != {target_severity}"

            symptom_text = ', '.join(all_symptoms)
            rows.append({
                'symptoms': symptom_text,
                'severity': severity,
                'max_weight': max_weight,
                'num_symptoms': len(all_symptoms)
            })
            count += 1

    # Shuffle the full dataset
    random.shuffle(rows)
    return pd.DataFrame(rows)


if __name__ == '__main__':
    print('🧬 Every Second Counts — Generating symptom-severity training dataset...')

    df = generate_dataset(3200)  # 800 per class

    print(f'\n📊 Dataset Statistics:')
    print(f'   Total samples: {len(df)}')
    print(f'   Class distribution:')
    for sev in ['GREEN', 'YELLOW', 'ORANGE', 'RED']:
        count = len(df[df['severity'] == sev])
        print(f'     {sev:8s}: {count} samples ({count/len(df)*100:.1f}%)')

    output_path = os.path.join(os.path.dirname(__file__), 'dataset', 'symptom_severity_dataset.csv')
    df.to_csv(output_path, index=False)
    print(f'\n✅ Dataset saved to: {output_path}')
