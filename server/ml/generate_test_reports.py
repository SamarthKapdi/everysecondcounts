"""
Generates 5 realistic medical test reports for Phase 2 evaluation:
1. cbc_report.pdf - Complete Blood Count (CBC) with microcytic anemia & leukocytosis
2. lipid_profile.pdf - Comprehensive Lipid Panel with high atherogenic risk
3. diabetes_panel.pdf - Diabetic glycemic assessment (FBS + HbA1c + PPBS)
4. kidney_metabolic.pdf - Renal function panel (KFT) with elevated creatinine & potassium
5. messy_scan.png - Low-resolution, noisy handwritten/degraded scan to test OCR and unreadable guard
"""

import os
import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

TEST_DIR = os.path.join(os.path.dirname(__file__), 'test_reports')
os.makedirs(TEST_DIR, exist_ok=True)

# 1. CBC Report PDF
def create_cbc_pdf():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4
    text = """METROPOLIS CLINICAL LABORATORIES
DEPARTMENT OF HEMATOLOGY - AUTOMATED CELL COUNTER
Patient: John Doe (42 Y / Male)      Ref By: Dr. R. Sharma
Date: 24-Oct-2026                    Sample ID: MET-CBC-90812

INVESTIGATION                  RESULT    REFERENCE RANGE     UNIT
Complete Blood Count (CBC)
Hemoglobin                     10.2      13.5 - 17.5         g/dL
RBC Count                      3.4       3.8 - 5.8           10^6/uL
Total WBC Count                14200     4000 - 11000        /uL
Platelet Count                 210000    150000 - 450000     /uL
Packed Cell Volume (PCV)       31.5      36.0 - 50.0         %
MCV                            74.0      80.0 - 100.0        fL
MCH                            24.0      27.0 - 33.0         pg
MCHC                           30.5      32.0 - 36.0         g/dL
Neutrophils                    78        40 - 75             %
Lymphocytes                    16        20 - 45             %
Eosinophils                    3         1 - 6               %
Monocytes                      3         2 - 10              %
Basophils                      0         0 - 2               %
ESR                            35        0 - 20              mm/hr

Impression: Microcytic hypochromic anemia with moderate neutrophilic leukocytosis and elevated ESR.
Report Verified by Senior Pathologist."""
    page.insert_text((50, 60), text, fontsize=10, fontname="helv")
    path = os.path.join(TEST_DIR, 'cbc_report.pdf')
    doc.save(path)
    doc.close()
    return path

# 2. Lipid Profile PDF
def create_lipid_pdf():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    text = """APOLLO DIAGNOSTICS & HEART INSTITUTE
CARDIOVASCULAR RISK EVALUATION - LIPID PROFILE
Patient: Anita Verma (55 Y / Female)   Ref By: Dr. S. Kulkarni
Date: 25-Oct-2026                      Sample ID: APL-LIP-44102

TEST NAME                      RESULT    DESIRABLE RANGE     UNIT
Total Cholesterol              248       125 - 200           mg/dL
Triglycerides                  285       < 150               mg/dL
HDL Cholesterol                36        50 - 70             mg/dL
LDL Cholesterol                164       < 100               mg/dL
VLDL Cholesterol               48        5 - 30              mg/dL

Clinical Note: Mixed hyperlipidemia with atherogenic dyslipidemia pattern.
High non-HDL cholesterol and suboptimal cardioprotective HDL level.
Verified by Consultant Biochemist."""
    page.insert_text((50, 60), text, fontsize=10, fontname="helv")
    path = os.path.join(TEST_DIR, 'lipid_profile.pdf')
    doc.save(path)
    doc.close()
    return path

# 3. Diabetes Glycemic Report PDF
def create_diabetes_pdf():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    text = """MAX HEALTHCARE ENDOCRINOLOGY LAB
DIABETES MONITORING & GLYCEMIC PROFILE
Patient: Robert Miller (58 Y / Male)   Ref By: Dr. K. Patel
Date: 25-Oct-2026                      Sample ID: MAX-DIA-88123

INVESTIGATION                  VALUE     REFERENCE RANGE     UNIT
Fasting Blood Sugar            168       70 - 99             mg/dL
Postprandial Glucose           242       70 - 140            mg/dL
HbA1c                          8.6       4.0 - 5.6           %

Interpretation:
HbA1c >= 6.5% confirms poorly controlled Diabetes Mellitus.
Elevated fasting and postprandial glucose values indicate significant glycemic escape.
Advised: Immediate endocrinology consultation and medical nutrition therapy."""
    page.insert_text((50, 60), text, fontsize=10, fontname="helv")
    path = os.path.join(TEST_DIR, 'diabetes_panel.pdf')
    doc.save(path)
    doc.close()
    return path

# 4. Kidney Function (KFT) PDF
def create_kidney_pdf():
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    text = """FORTIS HEALTHCARE RENAL CARE CENTER
RENAL FUNCTION TEST (KFT PANEL) & ELECTROLYTES
Patient: Suresh Rao (67 Y / Male)      Ref By: Dr. V. Nair
Date: 26-Oct-2026                      Sample ID: FOR-REN-31092

PARAMETER                      RESULT    NORMAL RANGE        UNIT
Serum Creatinine               2.9       0.7 - 1.3           mg/dL
Blood Urea Nitrogen            44        7 - 20              mg/dL
Serum Urea                     88        15 - 40             mg/dL
Uric Acid                      8.4       4.0 - 7.2           mg/dL
Serum Potassium                5.7       3.5 - 5.1           mEq/L
Serum Sodium                   132       135 - 145           mEq/L
Serum Calcium                  8.2       8.5 - 10.5          mg/dL

Remarks: Markedly elevated serum creatinine and urea indicating moderate renal insufficiency.
Mild hyperkalemia noted. Immediate nephrology evaluation and dietary potassium restriction recommended."""
    page.insert_text((50, 60), text, fontsize=10, fontname="helv")
    path = os.path.join(TEST_DIR, 'kidney_metabolic.pdf')
    doc.save(path)
    doc.close()
    return path

# 5. Messy degraded scan image
def create_messy_image():
    # Create image with artifacts, noise, blur, and simulated crumpled scan
    img = Image.new('RGB', (600, 300), color=(240, 235, 220))
    d = ImageDraw.Draw(img)
    
    # Degraded, low-contrast text
    d.text((30, 40), "LAB NOTE - UNREADABLE SCRIBBLING", fill=(180, 175, 170))
    d.text((30, 90), "~ ?!! blood check :: [corrupted scan lines] **", fill=(190, 185, 180))
    
    # Add noise
    arr = np.array(img)
    noise = np.random.normal(0, 35, arr.shape)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    noisy_img = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(1.8))
    
    path = os.path.join(TEST_DIR, 'messy_scan.png')
    noisy_img.save(path)
    return path

if __name__ == '__main__':
    f1 = create_cbc_pdf()
    f2 = create_lipid_pdf()
    f3 = create_diabetes_pdf()
    f4 = create_kidney_pdf()
    f5 = create_messy_image()
    print("Generated 5 test files:")
    print(" 1.", f1)
    print(" 2.", f2)
    print(" 3.", f3)
    print(" 4.", f4)
    print(" 5.", f5)
