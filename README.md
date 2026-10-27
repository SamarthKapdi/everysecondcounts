# 💓 Every Second Counts
### A Hybrid Rule-Based and Machine Learning Framework for Emergency Triage and Multi-Criteria Hospital Assurance

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active%20Development-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

In a medical emergency, every second between symptom onset and definitive care shapes the outcome — clinicians call it the Golden Hour. **Every Second Counts** is an end-to-end emergency healthcare assurance platform that classifies patient severity in seconds using a locally trained hybrid AI engine, routes them to the optimal hospital based on real-time capacity and clinical readiness, and carries them through their entire care journey — admission, insurance, lab diagnostics, blood availability, transplant coordination, and financial assistance — all the way to discharge.

## Problem Statement
The current emergency healthcare system is heavily siloed and relies on manual, delayed decision-making during critical moments. Patients often arrive at hospitals that lack the required specialists, available beds, or specific blood types, leading to dangerous secondary transfers and loss of the Golden Hour. Every Second Counts bridges this gap by unifying symptom triage, dynamic hospital capacity telemetry, and end-to-end patient lifecycle management into a single, real-time platform.

## Key Features
- 🧠 **Hybrid AI Triage**: Rule-Based pre-screening + Locally Trained ML Classifier + Deterministic Fallback. All AI runs locally; no third-party AI services.
- 🏥 **Multi-Criteria Hospital Routing**: Geospatial routing (Haversine) combined with weighted clinical readiness scoring.
- 📋 **Patient Lifecycle Management**: Seamless tracking from Admission → Treatment → Discharge.
- 🛡️ **Insurance Claim Processing**: Integrated claim initiation and status tracking.
- 🔬 **Pathology & Lab Test Management**: Real PDF extraction of lab results with local parsing and validation.
- 🩸 **Blood Bank Management**: Cross-hospital matching for critical blood inventory.
- 🫀 **Transplant Coordination**: Donor-recipient matching engine based on urgency and medical compatibility.
- 💖 **Fundraising & Financial Assistance**: Embedded support for crowdsourced patient funding.
- 📡 **Real-Time Telemetry Simulation**: Live streaming of hospital capacity and ambulance locations.
- 👥 **Role-Based Access Control**: 5 distinct operational roles (Admin, Doctor, Hospital Staff, Ambulance Driver, Patient).

## System Architecture

```mermaid
flowchart TD
    %% Define Styles
    classDef client fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef gateway fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef service fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef data fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef ml fill:#ec4899,stroke:#db2777,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    %% Client Layer (React)
    subgraph ClientLayer [Client Layer / React Frontend]
        direction LR
        P[Patient App]:::client
        D[Doctor Portal]:::client
        H[Hospital Admin]:::client
        A[Ambulance GPS]:::client
    end

    %% API Gateway Layer (Node.js/Express)
    subgraph GatewayLayer [API Gateway / Node.js Express]
        Auth[Auth & RBAC Middleware]:::gateway
        Sockets[Socket.io Real-time Bus]:::gateway
        REST[RESTful API Router]:::gateway
    end

    %% Core Services Layer
    subgraph ServicesLayer [Core Microservices]
        direction TB
        Triage[Triage Engine<br/>Hybrid Rule/ML/Scoring]:::service
        Routing[Routing Engine<br/>Haversine + Capacity]:::service
        Ops[Operations<br/>Admissions, Labs, Blood]:::service
        Finance[Finance<br/>Insurance & Funds]:::service
    end

    %% Data & External Layer
    subgraph DataLayer [Data & ML Layer]
        direction LR
        DB[(PostgreSQL + Prisma)]:::data
        Redis[(Redis Cache)]:::data
        MLService{{FastAPI ML Server<br/>TF-IDF + SVM}}:::ml
        Vision[Local ML<br/>Report Analysis]:::ml
    end

    %% Connections
    P & D & H & A --> REST
    P & A -.-> Sockets
    D & H -.-> Sockets
    
    REST --> Auth
    Auth --> Triage & Routing & Ops & Finance
    
    Triage --> MLService
    Ops --> Vision
    
    Triage & Routing & Ops & Finance --> DB
    Routing & Sockets --> Redis
```

## Tech Stack
| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, Tailwind CSS, Zustand, Socket.IO Client |
| **Backend** | Node.js, Express, Prisma ORM, Socket.IO, JWT Auth |
| **Machine Learning** | Python, FastAPI, Scikit-learn (TF-IDF + LinearSVC/LogisticRegression), PyMuPDF |
| **Database** | PostgreSQL |
| **Other** | PDF-Parse, Pytesseract, Bcrypt |

## Zero-API-Key & Fully Local Guarantee
**Every Second Counts operates 100% locally with zero cloud dependencies and zero API keys.** Risk screening uses an ML baseline trained on UCI Heart Disease (a proxy task) plus a transparent rule-based trend score and deterministic safety rules. It is screening and decision support, not clinically validated, and does not predict sudden attacks. No external AI APIs (such as OpenAI, Anthropic, or Google Gemini) are called anywhere in the platform.

## Local Machine Learning Architecture
Detailed architectural documentation: [Full Architecture Guide](docs/architecture.md)

1. **Emergency Triage Classifier (`POST /predict`)**:
   - **97.66% test accuracy**, **97.69% cross-validated**, trained locally on 3,200 clinical emergency cases.
   - 3-tier hybrid pipeline: Hard Rule Override (<1ms) → TF-IDF + Calibrated LinearSVC → Deterministic Scorer Fallback.
   - Documentation: [Triage Model Metrics](docs/model-metrics.md).

2. **First-Aid Intent Classifier & Safe Responder (`POST /chat`)**:
   - 12-class TF-IDF + LogisticRegression first-aid intent classifier with templated safe emergency responses (bleeding, burns, choking, stroke, chest pain, fever, anaphylaxis).
   - Calibrated safe fallback below confidence threshold: routes to doctor consultation or SOS dispatch.

3. **Medical Report & Lab Diagnostic Analyzer (`POST /analyze-report`)**:
   - **Category Classifier**: Recognizes its synthetic report templates across 9 diagnostic panels; this is not real-world accuracy.
   - **Severity Classifier**: 97.5% test accuracy on flagged abnormal vectors (`NORMAL`, `MONITOR`, `CONSULT_SOON`, `URGENT`).
   - **Lab Extraction**: 50+ common laboratory tests with synonym matching, unit normalization, age/sex reference ranges, and critical abnormal flagging.
   - **Low-Quality Safeguard**: Transparently returns `"could not read this file"` on low-contrast scans rather than hallucinating findings.
   - Documentation: [Report Model Metrics & Multi-Source Evaluation](docs/report-model-metrics.md).

4. **Multi-Modal Sudden-Attack Risk Engine (`POST /predict-risk`)**:
   - **Static Baseline (35%)**: Calibrated Logistic Regression trained on public UCI Cleveland Heart Disease dataset (303 records, Brier score = 0.1084, AUC = 0.9310).
   - **Dynamic Trajectory (65%)**: Transparent weighted trend score over symptom level/slope, red flags, missed check-ins, vital deviations, and medication adherence. ML is used for the UCI baseline only.
   - **Meta-Blend & Tiers**: Blended 0–100 risk score categorized into `LOW`, `MODERATE`, `HIGH`, `CRITICAL`.
   - **Hard Safety Override**: Any acute red-flag check-in in the last 48 hours unconditionally forces a minimum score of 75 and tier `CRITICAL`.
   - **Strict Wording Compliance**: Never outputs "you are safe" or "no risk". `LOW` tier explicitly renders: *"No elevated risk detected from the data you entered."*
   - **Deterministic Fallback**: Labeled `v1.0-deterministic-fallback (estimated basic mode)` when ML service is offline.
   - Documentation: [Sudden-Attack Risk Model](docs/risk-model.md).
   - **Validity limitation**: the UCI baseline predicts angiographic heart-disease presence as a proxy; the trend score and scenarios are synthetic and authored. This is screening and decision support, not a clinically validated predictor of sudden events.

### Optical Character Recognition (OCR) Setup on Windows
- **PDF Extraction**: Uses native PyMuPDF (`fitz`), works out of the box with zero system dependencies.
- **Image OCR (Optional)**: For analyzing image files (`.png`, `.jpg`), install Tesseract OCR for Windows:
  1. Download the Windows installer from [UB-Mannheim Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki).
  2. Install to default path `C:\Program Files\Tesseract-OCR` and add to your system PATH.
  3. If Tesseract is not installed or image contrast is insufficient, the system safely falls back with a clear message requesting a digital PDF.
  4. Verify installation in a new terminal with `tesseract --version`. If it is
     unavailable, image analysis returns `OCR engine not installed`; PDF text
     extraction remains available through PyMuPDF.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- PostgreSQL (running locally)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/SamarthKapdi/everysecondcounts.git
cd everysecondcounts

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment
```bash
cd ../server
cp .env.example .env
```
Update `.env` with your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/everysecondcounts?schema=public"
JWT_SECRET="your_secure_jwt_secret"
JWT_REFRESH_SECRET="your_secure_refresh_secret"
ML_SERVICE_URL="http://localhost:8001"
```

### 3. Database Setup
```bash
# Create the database in psql
createdb everysecondcounts

# Apply all committed Prisma migrations and seed the database
npx prisma migrate deploy
npx prisma db seed
```
*(The seeder creates default accounts like `admin@esc.health` / `esc12345678`)*

### 4. Machine Learning Service Setup
```bash
cd ml
# Create virtual environment
python -m venv venv
# Activate it (Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt

# Start the ML FastAPI server (runs on port 8001)
python predict_server.py
```
*(Note: A pre-trained `triage_model.pkl` is included. To retrain, run `python generate_dataset.py` followed by `python train_model.py`)*

### 5. Start the Application
Open two new terminal windows:

**Terminal 1 (Backend - Port 5000):**
```bash
cd server
npm start
```

**Terminal 2 (Frontend - Port 5173):**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Project Structure
```text
everysecondcounts/
├── README.md
├── LICENSE
├── .gitignore
├── docs/
│   └── model-metrics.md
├── client/
│   └── (React Application - UI, Dashboards, State Management)
└── server/
    ├── ml/
    │   ├── generate_dataset.py
    │   ├── train_model.py
    │   ├── predict_server.py
    │   ├── requirements.txt
    │   └── models/
    │       └── triage_model.pkl
    └── (Express Application - API Routes, Controllers, Prisma Schema)
```

## Screenshots
<!-- Add screenshots here -->

## Roadmap
- [ ] Interactive hospital availability maps
- [ ] Real-time traffic-aware ambulance routing integration
- [ ] Cloud deployment (AWS/GCP)
- [ ] Automated end-to-end test suite (Jest/Cypress)

## License
This project is licensed under the MIT License - see the LICENSE file for details.

---
**Author**: Samarth Kapdi  
*RGPV B.Tech CSE Major Project*
