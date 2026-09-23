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
- 🧠 **Hybrid AI Triage**: Rule-Based pre-screening + Locally Trained ML Classifier + Deterministic Fallback.
- 🏥 **Multi-Criteria Hospital Routing**: Geospatial routing (Haversine) combined with weighted clinical readiness scoring.
- 📋 **Patient Lifecycle Management**: Seamless tracking from Admission → Treatment → Discharge.
- 🛡️ **Insurance Claim Processing**: Integrated claim initiation and status tracking.
- 🔬 **Pathology & Lab Test Management**: Real PDF extraction of lab results. *(Image-based medical report analysis uses Gemini Vision)*.
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
        Vision[External AI<br/>Vision Analysis]:::ml
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
| **Machine Learning** | Python, FastAPI, Scikit-learn (TF-IDF + LinearSVC) |
| **Database** | PostgreSQL |
| **Other** | PDF-Parse, Bcrypt |

## ML Model Highlights
> **97.66% test accuracy**, **97.69% cross-validated**, trained entirely locally — no external AI API dependency for the core triage pipeline.

The triage engine utilizes a 3-tier hybrid architecture ensuring safety and reliability:
1. **Tier 1 (Rule-Based)**: Guaranteed detection of life-threatening conditions (e.g., stroke, cardiac arrest).
2. **Tier 2 (Locally Trained ML)**: TF-IDF vectorizer with Calibrated LinearSVC trained on a synthetic dataset of 3,200 labeled samples.
3. **Tier 3 (Deterministic Scorer)**: Fallback weighted scoring system if the ML service is down.

For full details, view the [Model Metrics Documentation](docs/model-metrics.md).

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
EXTERNAL_AI_API_KEY="optional_gemini_key_for_vision_features"
```

### 3. Database Setup
```bash
# Create the database in psql
createdb everysecondcounts

# Run Prisma migrations and seed the database
npx prisma migrate dev --name init
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
