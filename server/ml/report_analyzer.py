"""
Every Second Counts — Local Medical Report Analyzer
Pipeline:
1. Multi-format text extraction (PyMuPDF for PDFs, pytesseract for images).
2. Strict minimum text guard (<20 chars -> "could not read this file").
3. Regex extraction with 50+ common laboratory tests dictionary:
   - Canonical units, synonyms, age/sex reference ranges.
   - Status tagging: LOW, NORMAL, HIGH, CRITICAL.
4. Local ML Models:
   - Category Classifier (TF-IDF + Logistic Regression) -> Specialist recommendation.
   - Severity Classifier (Vectorized flag counts -> NORMAL, MONITOR, CONSULT_SOON, URGENT).
5. Plain-language templated clinical summary (no LLM, no external APIs).
"""

import os
import re
import io
import sys
import joblib
import numpy as np

# Optional imports with graceful fallbacks
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    from PIL import Image
    from PIL import ImageOps, ImageEnhance
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_PATH = os.path.join(SCRIPT_DIR, 'models', 'report_models.pkl')

# Load trained report models if available
report_models = None
if os.path.exists(MODELS_PATH):
    try:
        report_models = joblib.load(MODELS_PATH)
    except Exception as e:
        print(f"Warning: Could not load report_models.pkl: {e}", file=sys.stderr)

# ── 50+ Common Laboratory Tests Dictionary ────────────────────────────────────
LAB_DICTIONARY = {
    # ── Complete Blood Count (CBC) ──
    'hemoglobin': {
        'name': 'Hemoglobin',
        'synonyms': [r'\bhemo(?:globin)?\b', r'\bhaemo(?:globin)?\b', r'\bhgb\b', r'\bhb\b'],
        'unit': 'g/dL',
        'ref_male': (13.5, 17.5),
        'ref_female': (12.0, 15.5),
        'ref_default': (12.0, 17.5),
        'critical_low': 7.0,
        'critical_high': 20.0,
        'low_msg': 'Low hemoglobin suggests anemia, nutritional iron/folate deficiency, or blood loss.',
        'high_msg': 'High hemoglobin may indicate polycythemia, chronic hypoxia (smoking/COPD), or dehydration.',
        'specialist': 'Hematologist'
    },
    'rbc': {
        'name': 'RBC Count',
        'synonyms': [r'\brbc(?:\s+count)?\b', r'\bred\s+blood\s+cells?\b', r'\btotal\s+rbc\b'],
        'unit': '10^6/uL',
        'ref_default': (3.8, 5.8),
        'low_msg': 'Low red blood cell count may indicate anemia or bone marrow suppression.',
        'high_msg': 'Elevated red blood cells may indicate polycythemia or chronic hypoxia.',
        'specialist': 'Hematologist'
    },
    'wbc': {
        'name': 'Total WBC Count',
        'synonyms': [r'\btotal\s+wbc(?:\s+count)?\b', r'\bwbc(?:\s+count)?\b', r'\bwhite\s+blood\s+cells?\b', r'\bleukocyte\s+count\b', r'\btlc\b'],
        'unit': '/uL',
        'ref_default': (4000.0, 11000.0),
        'critical_low': 2000.0,
        'critical_high': 30000.0,
        'low_msg': 'Low white blood cell count (leukopenia) indicates heightened susceptibility to infections.',
        'high_msg': 'Elevated white blood cell count (leukocytosis) commonly indicates active bacterial infection or inflammation.',
        'specialist': 'Hematologist'
    },
    'platelets': {
        'name': 'Platelet Count',
        'synonyms': [r'\bplatelet(?:\s+count)?\b', r'\bplatelets\b', r'\bplt\b', r'\bthrombocytes?\b'],
        'unit': '/uL',
        'ref_default': (150000.0, 450000.0),
        'critical_low': 50000.0,
        'critical_high': 1000000.0,
        'multiplier_words': {'lakh': 100000.0, 'lakhs': 100000.0, 'lac': 100000.0, 'lacs': 100000.0},
        'low_msg': 'Low platelets (thrombocytopenia) carries risk of bruising or spontaneous bleeding.',
        'high_msg': 'Elevated platelets (thrombocytosis) may indicate reactive inflammation or hypercoagulability.',
        'specialist': 'Hematologist'
    },
    'pcv': {
        'name': 'Packed Cell Volume (PCV)',
        'synonyms': [r'\bpacked\s+cell\s+volume\b', r'\bpcv\b', r'\bhematocrit\b', r'\bhct\b'],
        'unit': '%',
        'ref_default': (36.0, 50.0),
        'low_msg': 'Low hematocrit reflects decreased circulating red cell mass.',
        'high_msg': 'Elevated hematocrit suggests hemoconcentration or erythrocytosis.',
        'specialist': 'Hematologist'
    },
    'mcv': {
        'name': 'MCV (Mean Corpuscular Volume)',
        'synonyms': [r'\bmcv\b', r'\bmean\s+corpuscular\s+volume\b'],
        'unit': 'fL',
        'ref_default': (80.0, 100.0),
        'low_msg': 'Microcytic red cells commonly seen in iron deficiency anemia or thalassemia trait.',
        'high_msg': 'Macrocytic red cells commonly caused by Vitamin B12/folate deficiency or liver disorder.',
        'specialist': 'Hematologist'
    },
    'mch': {
        'name': 'MCH',
        'synonyms': [r'\bmch\b', r'\bmean\s+corpuscular\s+hemoglobin\b'],
        'unit': 'pg',
        'ref_default': (27.0, 33.0),
        'low_msg': 'Hypochromic erythrocytes often paired with low iron levels.',
        'high_msg': 'High MCH suggests macrocytic red cell morphology.',
        'specialist': 'Hematologist'
    },
    'mchc': {
        'name': 'MCHC',
        'synonyms': [r'\bmchc\b', r'\bmean\s+corpuscular\s+hemoglobin\s+concentration\b'],
        'unit': 'g/dL',
        'ref_default': (32.0, 36.0),
        'low_msg': 'Low MCHC indicates reduced hemoglobin concentration per volume.',
        'high_msg': 'Elevated MCHC may indicate hereditary spherocytosis.',
        'specialist': 'Hematologist'
    },
    'neutrophils': {
        'name': 'Neutrophils',
        'synonyms': [r'\bneutrophils?\b', r'\bpolymorphs?\b', r'\banc\b'],
        'unit': '%',
        'ref_default': (40.0, 75.0),
        'low_msg': 'Neutropenia increases risk of severe microbial infections.',
        'high_msg': 'Neutrophilia is a typical hallmark of acute bacterial infection or tissue stress.',
        'specialist': 'General Physician'
    },
    'lymphocytes': {
        'name': 'Lymphocytes',
        'synonyms': [r'\blymphocytes?\b'],
        'unit': '%',
        'ref_default': (20.0, 45.0),
        'low_msg': 'Lymphopenia may occur with acute viral illness or immunodeficiency.',
        'high_msg': 'Lymphocytosis frequently accompanies viral infections or lymphoid disorders.',
        'specialist': 'General Physician'
    },
    'eosinophils': {
        'name': 'Eosinophils',
        'synonyms': [r'\beosinophils?\b'],
        'unit': '%',
        'ref_default': (1.0, 6.0),
        'low_msg': 'Low eosinophil count is rarely clinically significant on its own.',
        'high_msg': 'Eosinophilia typically correlates with allergic diseases, asthma, or parasitic conditions.',
        'specialist': 'Allergist / Pulmonologist'
    },
    'monocytes': {
        'name': 'Monocytes',
        'synonyms': [r'\bmonocytes?\b'],
        'unit': '%',
        'ref_default': (2.0, 10.0),
        'low_msg': 'Low monocytes may occur in bone marrow suppression.',
        'high_msg': 'Monocytosis suggests chronic infection or recovery phase of an acute illness.',
        'specialist': 'General Physician'
    },
    'basophils': {
        'name': 'Basophils',
        'synonyms': [r'\bbasophils?\b'],
        'unit': '%',
        'ref_default': (0.0, 2.0),
        'low_msg': 'Normal physiological baseline.',
        'high_msg': 'Basophilia may be associated with myeloproliferative diseases or severe allergies.',
        'specialist': 'Hematologist'
    },
    'esr': {
        'name': 'ESR',
        'synonyms': [r'\berythrocyte\s+sedimentation\s+rate\b', r'\besr\b'],
        'unit': 'mm/hr',
        'ref_default': (0.0, 20.0),
        'low_msg': 'Normal sedimentation finding.',
        'high_msg': 'Elevated ESR signals systemic inflammation, infection, or connective tissue disease.',
        'specialist': 'General Physician'
    },

    # ── Diabetes & Glycemic Control ──
    'fasting_glucose': {
        'name': 'Fasting Blood Glucose',
        'synonyms': [r'\bfasting\s+blood\s+(?:sugar|glucose)\b', r'\bfbs\b', r'\bglucose\s+fasting\b'],
        'unit': 'mg/dL',
        'ref_default': (70.0, 99.0),
        'critical_low': 50.0,
        'critical_high': 300.0,
        'low_msg': 'Hypoglycemia detected: requires immediate fast-acting carbohydrate replenishment.',
        'high_msg': 'Impaired fasting glucose / hyperglycemia indicates diabetes risk or inadequate insulin coverage.',
        'specialist': 'Endocrinologist'
    },
    'postprandial_glucose': {
        'name': 'Postprandial Glucose',
        'synonyms': [r'\bpost\s*(?:prandial)?\s*(?:blood)?\s*(?:sugar|glucose)\b', r'\bppbs\b', r'\bglucose\s+pp\b'],
        'unit': 'mg/dL',
        'ref_default': (70.0, 140.0),
        'critical_low': 50.0,
        'critical_high': 350.0,
        'low_msg': 'Post-meal hypoglycemia requires medical review of medications.',
        'high_msg': 'Postprandial hyperglycemia reflects impaired glucose tolerance.',
        'specialist': 'Endocrinologist'
    },
    'random_glucose': {
        'name': 'Random Blood Glucose',
        'synonyms': [r'\brandom\s+(?:blood)?\s*(?:sugar|glucose)\b', r'\brbs\b'],
        'unit': 'mg/dL',
        'ref_default': (70.0, 140.0),
        'critical_low': 50.0,
        'critical_high': 300.0,
        'low_msg': 'Low blood glucose requires attention to prevent neuroglycopenic symptoms.',
        'high_msg': 'Elevated random glucose indicates probable hyperglycemia or uncontrolled diabetes.',
        'specialist': 'Endocrinologist'
    },
    'hba1c': {
        'name': 'HbA1c (Glycated Hemoglobin)',
        'synonyms': [r'\bhba1c\b', r'\bglycated\s+h(?:a)?emoglobin\b', r'\ba1c\b'],
        'unit': '%',
        'ref_default': (4.0, 5.6),
        'critical_high': 10.0,
        'low_msg': 'Low HbA1c may point to recurrent hypoglycemia or chronic hemolysis.',
        'high_msg': 'Elevated HbA1c (>=5.7% prediabetes, >=6.5% diabetes) indicates poor 3-month glycemic control.',
        'specialist': 'Endocrinologist'
    },

    # ── Lipid Profile ──
    'total_cholesterol': {
        'name': 'Total Cholesterol',
        'synonyms': [r'\btotal\s+cholesterol\b', r'\bserum\s+cholesterol\b', r'\bcholesterol\s+total\b'],
        'unit': 'mg/dL',
        'ref_default': (125.0, 200.0),
        'critical_high': 300.0,
        'low_msg': 'Significantly low cholesterol may reflect malabsorption or hepatic synthetic deficit.',
        'high_msg': 'Hypercholesterolemia increases atherogenic cardiovascular and cerebrovascular risk.',
        'specialist': 'Cardiologist'
    },
    'ldl_cholesterol': {
        'name': 'LDL Cholesterol',
        'synonyms': [r'\bldl(?:\s+cholesterol)?\b', r'\blow\s+density\s+lipoprotein\b'],
        'unit': 'mg/dL',
        'ref_default': (0.0, 100.0),
        'critical_high': 190.0,
        'low_msg': 'Optimal atherogenic profile.',
        'high_msg': 'Elevated LDL (bad cholesterol) accelerates arterial plaque deposition.',
        'specialist': 'Cardiologist'
    },
    'hdl_cholesterol': {
        'name': 'HDL Cholesterol',
        'synonyms': [r'\bhdl(?:\s+cholesterol)?\b', r'\bhigh\s+density\s+lipoprotein\b'],
        'unit': 'mg/dL',
        'ref_male': (40.0, 60.0),
        'ref_female': (50.0, 70.0),
        'ref_default': (40.0, 60.0),
        'low_msg': 'Low HDL (good cholesterol) diminishes cardioprotective reverse cholesterol transport.',
        'high_msg': 'High HDL provides favorable vascular protection.',
        'specialist': 'Cardiologist'
    },
    'triglycerides': {
        'name': 'Triglycerides',
        'synonyms': [r'\btriglycerides?\b', r'\bserum\s+triglycerides?\b', r'\btg\b'],
        'unit': 'mg/dL',
        'ref_default': (0.0, 150.0),
        'critical_high': 500.0,
        'low_msg': 'Low circulating triglycerides.',
        'high_msg': 'Hypertriglyceridemia correlates with insulin resistance, cardiovascular disease, and pancreatitis risk if >=500.',
        'specialist': 'Cardiologist'
    },
    'vldl_cholesterol': {
        'name': 'VLDL Cholesterol',
        'synonyms': [r'\bvldl(?:\s+cholesterol)?\b', r'\bvery\s+low\s+density\b'],
        'unit': 'mg/dL',
        'ref_default': (5.0, 30.0),
        'low_msg': 'Normal finding.',
        'high_msg': 'Elevated VLDL indicates excess circulating triglyceride-rich particles.',
        'specialist': 'Cardiologist'
    },

    # ── Kidney Function (KFT / RFT) ──
    'serum_creatinine': {
        'name': 'Serum Creatinine',
        'synonyms': [r'\bserum\s+creatinine\b', r'\bcreatinine\b', r'\bsr\.?\s*creatinine\b'],
        'unit': 'mg/dL',
        'ref_male': (0.7, 1.3),
        'ref_female': (0.5, 1.1),
        'ref_default': (0.6, 1.2),
        'critical_high': 4.0,
        'low_msg': 'Low creatinine often reflects reduced muscle mass.',
        'high_msg': 'Elevated creatinine signals impaired glomerular filtration or acute/chronic kidney injury.',
        'specialist': 'Nephrologist'
    },
    'blood_urea_nitrogen': {
        'name': 'BUN (Blood Urea Nitrogen)',
        'synonyms': [r'\bblood\s+urea\s+nitrogen\b', r'\bbun\b'],
        'unit': 'mg/dL',
        'ref_default': (7.0, 20.0),
        'critical_high': 80.0,
        'low_msg': 'Low BUN may occur in low-protein diets or severe liver disease.',
        'high_msg': 'Elevated BUN suggests dehydration, high protein catabolism, or renal impairment.',
        'specialist': 'Nephrologist'
    },
    'serum_urea': {
        'name': 'Serum Urea',
        'synonyms': [r'\bserum\s+urea\b', r'\burea\b', r'\bblood\s+urea\b'],
        'unit': 'mg/dL',
        'ref_default': (15.0, 40.0),
        'critical_high': 100.0,
        'low_msg': 'Low urea usually indicates low protein intake or hyperhydration.',
        'high_msg': 'High urea levels indicate impaired nitrogenous waste excretion by the kidneys.',
        'specialist': 'Nephrologist'
    },
    'uric_acid': {
        'name': 'Uric Acid',
        'synonyms': [r'\buric\s+acid\b', r'\bserum\s+uric\s+acid\b'],
        'unit': 'mg/dL',
        'ref_male': (4.0, 7.2),
        'ref_female': (2.7, 6.1),
        'ref_default': (3.5, 7.2),
        'low_msg': 'Hypouricemia is generally clinically benign.',
        'high_msg': 'Hyperuricemia predisposes to gout arthritis and uric acid nephrolithiasis.',
        'specialist': 'Rheumatologist / Nephrologist'
    },
    'egfr': {
        'name': 'eGFR',
        'synonyms': [r'\begfr\b', r'\bestimated\s+gfr\b', r'\bglomerular\s+filtration\s+rate\b'],
        'unit': 'mL/min/1.73m2',
        'ref_default': (60.0, 120.0),
        'critical_low': 15.0,
        'low_msg': 'Reduced eGFR indicates decreased renal filtration stage.',
        'high_msg': 'Normal high filtration rate.',
        'specialist': 'Nephrologist'
    },

    # ── Liver Function (LFT) ──
    'sgot': {
        'name': 'SGOT / AST',
        'synonyms': [r'\bsgot\b', r'\bast\b', r'\baspartate\s+aminotransferase\b'],
        'unit': 'U/L',
        'ref_default': (10.0, 40.0),
        'critical_high': 200.0,
        'low_msg': 'Normal baseline enzyme level.',
        'high_msg': 'Elevated AST signals hepatic parenchymal injury, cardiac strain, or skeletal muscle damage.',
        'specialist': 'Hepatologist / Gastroenterologist'
    },
    'sgpt': {
        'name': 'SGPT / ALT',
        'synonyms': [r'\bsgpt\b', r'\balt\b', r'\balanine\s+aminotransferase\b'],
        'unit': 'U/L',
        'ref_default': (7.0, 56.0),
        'critical_high': 200.0,
        'low_msg': 'Normal baseline enzyme level.',
        'high_msg': 'Elevated ALT is a specific marker of liver hepatocellular inflammation or fatty infiltration.',
        'specialist': 'Hepatologist / Gastroenterologist'
    },
    'alkaline_phosphatase': {
        'name': 'Alkaline Phosphatase (ALP)',
        'synonyms': [r'\balkaline\s+phosphatase\b', r'\balp\b', r'\bserum\s+alp\b'],
        'unit': 'U/L',
        'ref_default': (44.0, 147.0),
        'critical_high': 400.0,
        'low_msg': 'Low ALP may reflect zinc or magnesium deficiency.',
        'high_msg': 'High ALP indicates cholestatic biliary obstruction or active bone turnover.',
        'specialist': 'Gastroenterologist'
    },
    'total_bilirubin': {
        'name': 'Total Bilirubin',
        'synonyms': [r'\btotal\s+bilirubin\b', r'\bbilirubin\s+total\b', r'\bserum\s+bilirubin\b'],
        'unit': 'mg/dL',
        'ref_default': (0.2, 1.2),
        'critical_high': 5.0,
        'low_msg': 'Normal baseline finding.',
        'high_msg': 'Hyperbilirubinemia causes clinical jaundice, pointing to biliary obstruction or liver dysfunction.',
        'specialist': 'Gastroenterologist'
    },
    'direct_bilirubin': {
        'name': 'Direct Bilirubin',
        'synonyms': [r'\bdirect\s+bilirubin\b', r'\bconjugated\s+bilirubin\b'],
        'unit': 'mg/dL',
        'ref_default': (0.0, 0.3),
        'low_msg': 'Normal baseline.',
        'high_msg': 'Elevated conjugated bilirubin reflects impaired bile excretion or canalicular damage.',
        'specialist': 'Gastroenterologist'
    },
    'indirect_bilirubin': {
        'name': 'Indirect Bilirubin',
        'synonyms': [r'\bindirect\s+bilirubin\b', r'\bunconjugated\s+bilirubin\b'],
        'unit': 'mg/dL',
        'ref_default': (0.2, 0.8),
        'low_msg': 'Normal baseline.',
        'high_msg': 'Elevated unconjugated bilirubin suggests accelerated hemolysis or Gilbert syndrome.',
        'specialist': 'Hematologist / Hepatologist'
    },
    'total_protein': {
        'name': 'Total Protein',
        'synonyms': [r'\btotal\s+protein\b', r'\bprotein\s+total\b', r'\bserum\s+total\s+protein\b'],
        'unit': 'g/dL',
        'ref_default': (6.0, 8.3),
        'low_msg': 'Hypoproteinemia may indicate malnutrition, malabsorption, or nephrotic loss.',
        'high_msg': 'High total protein suggests chronic inflammation, dehydration, or paraproteinemia.',
        'specialist': 'General Physician'
    },
    'albumin': {
        'name': 'Albumin',
        'synonyms': [r'\bserum\s+albumin\b', r'\balbumin\b'],
        'unit': 'g/dL',
        'ref_default': (3.5, 5.0),
        'critical_low': 2.0,
        'low_msg': 'Hypoalbuminemia points to compromised liver protein synthesis, nephrotic syndrome, or malnutrition.',
        'high_msg': 'Elevated albumin typically results from intravascular volume contraction (dehydration).',
        'specialist': 'General Physician'
    },
    'globulin': {
        'name': 'Globulin',
        'synonyms': [r'\bserum\s+globulin\b', r'\bglobulin\b'],
        'unit': 'g/dL',
        'ref_default': (2.0, 3.5),
        'low_msg': 'Low globulin levels may suggest an immunodeficiency state.',
        'high_msg': 'High globulin reflects immune activation, infection, or monoclonal protein presence.',
        'specialist': 'General Physician'
    },
    'ag_ratio': {
        'name': 'A/G Ratio',
        'synonyms': [r'\ba/g\s+ratio\b', r'\balbumin\s*[\/\-]\s*globulin\s+ratio\b', r'\bag\s+ratio\b'],
        'unit': '',
        'ref_default': (1.1, 2.5),
        'low_msg': 'Low A/G ratio is seen in liver cirrhosis, nephrosis, or chronic autoimmune states.',
        'high_msg': 'Elevated A/G ratio is generally benign.',
        'specialist': 'General Physician'
    },
    'ggt': {
        'name': 'GGT (Gamma-Glutamyl Transferase)',
        'synonyms': [r'\bggt\b', r'\bgamma\s+glutamyl\s+transferase\b', r'\bgamma\s*gt\b'],
        'unit': 'U/L',
        'ref_default': (9.0, 48.0),
        'low_msg': 'Normal baseline.',
        'high_msg': 'Elevated GGT indicates biliary stasis or hepatotoxic exposure (alcohol or medication).',
        'specialist': 'Hepatologist'
    },

    # ── Thyroid Profile ──
    'tsh': {
        'name': 'TSH (Thyroid Stimulating Hormone)',
        'synonyms': [r'\btsh\b', r'\bthyroid\s+stimulating\s+hormone\b', r'\bs\.\s*tsh\b'],
        'unit': 'uIU/mL',
        'ref_default': (0.4, 4.5),
        'critical_low': 0.1,
        'critical_high': 10.0,
        'low_msg': 'Low TSH suggests primary hyperthyroidism (thyrotoxicosis) or exogenous thyroid hormone excess.',
        'high_msg': 'Elevated TSH indicates primary hypothyroidism or subclinical thyroid dysfunction.',
        'specialist': 'Endocrinologist'
    },
    'total_t3': {
        'name': 'Total T3',
        'synonyms': [r'\btotal\s+t3\b', r'\bt3\s+total\b', r'\btriiodothyronine\b'],
        'unit': 'ng/dL',
        'ref_default': (80.0, 200.0),
        'low_msg': 'Low T3 may indicate non-thyroidal illness or severe hypothyroidism.',
        'high_msg': 'Elevated T3 occurs in T3-toxicosis and general hyperthyroidism.',
        'specialist': 'Endocrinologist'
    },
    'total_t4': {
        'name': 'Total T4',
        'synonyms': [r'\btotal\s+t4\b', r'\bt4\s+total\b', r'\bthyroxine\b'],
        'unit': 'ug/dL',
        'ref_default': (4.5, 12.0),
        'low_msg': 'Low T4 supports a diagnosis of hypothyroidism.',
        'high_msg': 'High T4 suggests hyperthyroid activity.',
        'specialist': 'Endocrinologist'
    },
    'free_t3': {
        'name': 'Free T3 (FT3)',
        'synonyms': [r'\bfree\s+t3\b', r'\bft3\b'],
        'unit': 'pg/mL',
        'ref_default': (2.0, 4.4),
        'low_msg': 'Low unbound active thyroid hormone.',
        'high_msg': 'Elevated free T3 indicates metabolic thyrotoxicosis.',
        'specialist': 'Endocrinologist'
    },
    'free_t4': {
        'name': 'Free T4 (FT4)',
        'synonyms': [r'\bfree\s+t4\b', r'\bft4\b'],
        'unit': 'ng/dL',
        'ref_default': (0.8, 1.8),
        'low_msg': 'Reduced free thyroxine confirms hypothyroid state.',
        'high_msg': 'Elevated free thyroxine confirms hyperthyroid state.',
        'specialist': 'Endocrinologist'
    },

    # ── Vitamins & Electrolytes ──
    'vitamin_d': {
        'name': 'Vitamin D (25-OH)',
        'synonyms': [r'\b25\s*(?:oh|hydroxy)?\s*vitamin\s+d\b', r'\bvitamin\s+d\b', r'\bvit\s+d\b'],
        'unit': 'ng/mL',
        'ref_default': (30.0, 100.0),
        'critical_low': 10.0,
        'low_msg': 'Vitamin D deficiency impairs calcium absorption and skeletal bone density.',
        'high_msg': 'High Vitamin D carries risk of hypercalcemia; evaluate supplementation dose.',
        'specialist': 'Endocrinologist / General Physician'
    },
    'vitamin_b12': {
        'name': 'Vitamin B12',
        'synonyms': [r'\bvitamin\s+b12\b', r'\bvit\s+b12\b', r'\bcobalamin\b', r'\bb12\b'],
        'unit': 'pg/mL',
        'ref_default': (200.0, 900.0),
        'critical_low': 100.0,
        'low_msg': 'Vitamin B12 deficiency leads to megaloblastic anemia, fatigue, and peripheral neuropathy.',
        'high_msg': 'High B12 usually reflects excessive oral/parenteral supplementation.',
        'specialist': 'General Physician / Neurologist'
    },
    'ferritin': {
        'name': 'Serum Ferritin',
        'synonyms': [r'\bserum\s+ferritin\b', r'\bferritin\b'],
        'unit': 'ng/mL',
        'ref_male': (20.0, 250.0),
        'ref_female': (10.0, 150.0),
        'ref_default': (15.0, 200.0),
        'low_msg': 'Low ferritin confirms depleted iron stores before overt anemia manifests.',
        'high_msg': 'Elevated ferritin serves as an acute phase reactant or suggests iron overload.',
        'specialist': 'Hematologist'
    },
    'sodium': {
        'name': 'Serum Sodium',
        'synonyms': [r'\bserum\s+sodium\b', r'\bsodium\b', r'\bna\+\b'],
        'unit': 'mEq/L',
        'ref_default': (135.0, 145.0),
        'critical_low': 120.0,
        'critical_high': 160.0,
        'low_msg': 'Hyponatremia presents risk of cerebral edema, headache, and weakness.',
        'high_msg': 'Hypernatremia points to significant water deficit and severe dehydration.',
        'specialist': 'Nephrologist / Emergency Care'
    },
    'potassium': {
        'name': 'Serum Potassium',
        'synonyms': [r'\bserum\s+potassium\b', r'\bpotassium\b', r'\bk\+\b'],
        'unit': 'mEq/L',
        'ref_default': (3.5, 5.1),
        'critical_low': 2.8,
        'critical_high': 6.2,
        'low_msg': 'Hypokalemia increases myocardial excitability, muscle weakness, and cardiac arrhythmias.',
        'high_msg': 'Hyperkalemia represents an urgent cardiac hazard with potential for lethal dysrhythmias.',
        'specialist': 'Cardiologist / Emergency Care'
    },
    'calcium': {
        'name': 'Serum Calcium',
        'synonyms': [r'\bserum\s+calcium\b', r'\bcalcium\b', r'\bca\+\+\b'],
        'unit': 'mg/dL',
        'ref_default': (8.5, 10.5),
        'critical_low': 6.5,
        'critical_high': 13.0,
        'low_msg': 'Hypocalcemia causes paresthesias, neuromuscular irritability, and muscle spasms.',
        'high_msg': 'Hypercalcemia may point to hyperparathyroidism or malignancy.',
        'specialist': 'Endocrinologist'
    },

    # ── Cardiac Biomarkers ──
    'troponin_i': {
        'name': 'Cardiac Troponin I',
        'synonyms': [r'\btroponin\s*i\b', r'\bcardiac\s+troponin\b', r'\btrop\s*i\b', r'\bhs-ctni\b'],
        'unit': 'ng/mL',
        'ref_default': (0.0, 0.04),
        'critical_high': 0.04,
        'low_msg': 'Normal biomarker baseline.',
        'high_msg': 'Elevated cardiac troponin indicates myocardial injury or acute myocardial infarction.',
        'specialist': 'Cardiologist / Emergency Medicine'
    },
    'cpk_mb': {
        'name': 'CPK-MB',
        'synonyms': [r'\bcpk\s*[\-\s]*mb\b', r'\bck\s*[\-\s]*mb\b', r'\bcreatine\s+kinase\s+mb\b'],
        'unit': 'U/L',
        'ref_default': (0.0, 25.0),
        'critical_high': 50.0,
        'low_msg': 'Normal finding.',
        'high_msg': 'Elevated CPK-MB supports recent myocardial or significant skeletal muscle damage.',
        'specialist': 'Cardiologist'
    }
}

# ── Extraction Engine ────────────────────────────────────────────────────────
def extract_text_from_bytes(file_bytes: bytes, filename: str) -> tuple[str, str]:
    """
    Extracts text from PDF or image using local PyMuPDF / pytesseract.
    Returns (extracted_text, method_used).
    """
    fn = filename.lower()
    text = ""
    method = "unknown"

    if fn.endswith('.pdf'):
        if fitz is None:
            return "", "PyMuPDF not installed"
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text() + "\n"
            method = "PyMuPDF"
        except Exception as e:
            text = ""
            method = f"PyMuPDF error: {str(e)}"

    elif any(fn.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp']):
        if Image is None or pytesseract is None:
            return "", "pytesseract/PIL not installed"
        try:
            img = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(img)
            if len(text.strip()) < 20:
                enhanced = ImageOps.autocontrast(img.convert('L'))
                enhanced = ImageEnhance.Sharpness(enhanced).enhance(2.0)
                retry_text = pytesseract.image_to_string(enhanced)
                if len(retry_text.strip()) > len(text.strip()):
                    text = retry_text
                    method = "pytesseract-autocontrast"
                else:
                    method = "pytesseract"
        except pytesseract.TesseractNotFoundError:
            text = ""
            method = "OCR engine not installed"
        except Exception as e:
            text = ""
            method = f"pytesseract error: {str(e)}"

    return text.strip(), method


def extract_lab_values(text: str, sex: str = 'unknown', age: int = None) -> list:
    """
    Scans the extracted text against LAB_DICTIONARY using regular expressions.
    Normalizes units, handles multipliers, and checks sex-specific reference ranges.
    Returns list of dicts with test details and status.
    """
    results = []
    text_lower = text.lower()
    lines = text.splitlines()

    for key, spec in LAB_DICTIONARY.items():
        # Match test name against lines
        for syn in spec['synonyms']:
            pattern = re.compile(syn, re.IGNORECASE)
            
            # Find matching line
            matched = False
            for line in lines:
                m = pattern.search(line)
                if not m:
                    continue

                # Search for numeric values after the match or in the line
                # Look for numbers like 14.5, 150000, 2.4, etc.
                after_match = line[m.end():]
                # Check for number patterns
                num_matches = re.findall(r'[:\s\-=]+(\d+(?:\.\d+)?)', after_match)
                if not num_matches:
                    # Try finding anywhere in line after name
                    num_matches = re.findall(r'(\d+(?:\.\d+)?)', after_match)

                if num_matches:
                    raw_val = float(num_matches[0])

                    # Multiplier check (e.g., '1.8 lakhs' -> 180,000)
                    if 'multiplier_words' in spec:
                        for word, factor in spec['multiplier_words'].items():
                            if word in line.lower():
                                raw_val = raw_val * factor
                                break
                        # If platelets is written as 1.5 - 4.5 without the word lakh, but unit is 10^5 or similar
                        if spec['unit'] == '/uL' and raw_val < 50.0:
                            raw_val = raw_val * 100000.0

                    # Reference range calculation
                    ref = spec['ref_default']
                    if sex.lower().startswith('m') and 'ref_male' in spec:
                        ref = spec['ref_male']
                    elif sex.lower().startswith('f') and 'ref_female' in spec:
                        ref = spec['ref_female']

                    low_ref, high_ref = ref

                    # Status Determination
                    status = 'normal'
                    crit_low = spec.get('critical_low')
                    crit_high = spec.get('critical_high')

                    if crit_low is not None and raw_val <= crit_low:
                        status = 'critical'
                    elif crit_high is not None and raw_val >= crit_high:
                        status = 'critical'
                    elif raw_val < low_ref:
                        status = 'low'
                    elif raw_val > high_ref:
                        status = 'high'

                    results.append({
                        'key': key,
                        'name': spec['name'],
                        'value': round(raw_val, 2),
                        'unit': spec['unit'],
                        'status': status,
                        'referenceRange': f"{low_ref} - {high_ref} {spec['unit']}".strip(),
                        'low_msg': spec.get('low_msg', ''),
                        'high_msg': spec.get('high_msg', ''),
                        'specialist': spec.get('specialist', 'General Physician')
                    })
                    matched = True
                    break

            if matched:
                break

    return results


def analyze_report(file_bytes: bytes = None, filename: str = None, sex: str = 'unknown', age: int = None, text_content: str = None) -> dict:
    """
    Main pipeline entrypoint.
    Returns structured analysis payload conforming to Every Second Counts API contract.
    """
    if text_content:
        extracted_text = text_content
        method = "text_input"
    elif file_bytes is not None and filename:
        extracted_text, method = extract_text_from_bytes(file_bytes, filename)
    else:
        extracted_text, method = "", "no_input"

    # 1. Guard against empty / unreadable files
    if len(extracted_text) < 20:
        if method == 'OCR engine not installed':
            return {
                'success': False,
                'error': 'OCR engine not installed',
                'message': 'Image OCR requires the Tesseract OCR engine. Install Tesseract and ensure it is available on PATH.',
                'extractionMethod': method,
                'summary': 'Could not run image OCR because the Tesseract OCR engine is not installed.',
                'findings': [],
                'actions': ['Install Tesseract OCR and upload the image again.'],
                'specialist': 'General Physician',
                'severity': 'NORMAL',
                'category': 'GENERAL'
            }
        return {
            'success': False,
            'error': 'could not read this file',
            'message': 'The file contains insufficient readable text. If this is a scanned document, please ensure it is clear, high-contrast, or provide a digital PDF.',
            'extractionMethod': method,
            'summary': 'Could not extract readable text from this file. It may be an unsupported image format, a low-resolution scan, or an empty document.',
            'findings': [],
            'actions': ['Please upload a clearer digital PDF or standard high-resolution report scan.'],
            'specialist': 'General Physician',
            'severity': 'NORMAL',
            'category': 'GENERAL'
        }

    # 2. Extract structured lab parameters
    lab_findings = extract_lab_values(extracted_text, sex, age)

    # 3. Categorize report using local TF-IDF model
    predicted_category = 'GENERAL'
    recommended_specialist = 'General Physician'
    if report_models and 'category_pipeline' in report_models:
        try:
            pred = report_models['category_pipeline'].predict([extracted_text])[0]
            predicted_category = str(pred)
            specialists_map = report_models.get('specialists_map', {})
            recommended_specialist = specialists_map.get(predicted_category, 'General Physician')
        except Exception as e:
            print(f"Category prediction error: {e}", file=sys.stderr)

    # 4. Severity classification using local model + critical safety override
    num_critical = sum(1 for f in lab_findings if f['status'] == 'critical')
    num_high = sum(1 for f in lab_findings if f['status'] == 'high')
    num_low = sum(1 for f in lab_findings if f['status'] == 'low')
    total_found = len(lab_findings)
    ratio = (num_critical + num_high + num_low) / max(1, total_found)

    severity = 'NORMAL'
    if report_models and 'severity_classifier' in report_models:
        try:
            features = np.array([[num_critical, num_high, num_low, total_found, ratio]])
            sev_pred = report_models['severity_classifier'].predict(features)[0]
            severity = str(sev_pred)
        except Exception as e:
            print(f"Severity prediction error: {e}", file=sys.stderr)

    # Clinical hard override: Any CRITICAL value forces URGENT severity
    if num_critical > 0:
        severity = 'URGENT'
    elif (num_high + num_low) > 0 and severity == 'NORMAL':
        severity = 'MONITOR'

    # If abnormal values have a specific specialist, prioritize that
    abnormal_specialists = [f['specialist'] for f in lab_findings if f['status'] in ('high', 'low', 'critical')]
    if abnormal_specialists:
        recommended_specialist = abnormal_specialists[0]

    # 5. Build plain-language template summary (zero external AI calls)
    abnormal_items = [f for f in lab_findings if f['status'] in ('high', 'low', 'critical')]
    
    summary_parts = []
    summary_parts.append(
        f"Analyzed {predicted_category} panel identifying {total_found} laboratory parameter(s) via local clinical extraction."
    )

    if abnormal_items:
        details = []
        for item in abnormal_items:
            prefix = "CRITICAL: " if item['status'] == 'critical' else ""
            msg = item['high_msg'] if item['status'] == 'high' else item['low_msg']
            details.append(
                f"{prefix}{item['name']} is {item['status'].upper()} at {item['value']} {item['unit']} (reference: {item['referenceRange']}). {msg}"
            )
        summary_parts.append("Key abnormalities detected: " + " ".join(details))
    else:
        if total_found > 0:
            summary_parts.append("All identified laboratory parameters are within their standard physiological reference ranges.")
        else:
            summary_parts.append("General medical report analyzed. No standard out-of-range lab parameters detected in textual scan.")

    summary_parts.append(
        "Disclaimer: This analysis was generated entirely using local ML classification and rule-based clinical parameter extraction without third-party AI services. It is intended for informational and screening support only, not a formal diagnosis. Consult a qualified medical practitioner."
    )

    full_summary = " ".join(summary_parts)

    # UI Findings structure for ReportAnalyzer.jsx
    findings_for_ui = [
        {
            'label': item['name'],
            'value': f"{item['value']} {item['unit']}".strip(),
            'status': item['status'],
            'reference': item['referenceRange']
        }
        for item in lab_findings
    ]

    # Recommended Actions
    actions = []
    if severity == 'URGENT':
        actions.append(f"Seek urgent medical evaluation with a {recommended_specialist} or visit the nearest Emergency Room.")
        actions.append("One or more critical parameters require immediate clinical verification.")
    elif severity == 'CONSULT_SOON':
        actions.append(f"Schedule a comprehensive review with a {recommended_specialist} within 48 to 72 hours.")
        actions.append("Monitor for related physical symptoms and keep baseline vitals logged.")
    elif severity == 'MONITOR':
        actions.append(f"Discuss these mildly elevated/depressed parameters with your primary doctor at your next visit.")
        actions.append("Maintain routine health tracking and hydration.")
    else:
        actions.append("Continue standard preventive health checkups and healthy lifestyle habits.")

    return {
        'success': True,
        'summary': full_summary,
        'findings': findings_for_ui,
        'actions': actions,
        'specialist': recommended_specialist,
        'severity': severity,
        'category': predicted_category,
        'extractedText': extracted_text[:3000],
        'totalParametersExtracted': total_found,
        'abnormalCount': len(abnormal_items),
        'extractedLabValues': lab_findings,
        'extractionEngine': f"Every Second Counts Local ML & Extraction Engine ({method})"
    }
