# PulsePath AI 🚑⚡

> AI-Powered Emergency Triage & Smart Hospital Routing Platform

PulsePath AI is a real-time healthcare emergency coordination platform designed to intelligently analyze symptoms, classify emergency severity, recommend the best hospitals, and coordinate emergency response workflows using AI, real-time telemetry, and operational dashboards.

Built for **HackXcelerate 2K26**.

---

# 🌟 Vision

PulsePath AI is not just a symptom checker.

It is an:

> **AI-assisted Emergency Coordination Infrastructure**

The platform combines:

* AI-powered triage
* smart hospital routing
* real-time emergency monitoring
* ambulance coordination
* telemetry streaming
* operational dashboards

to create a realistic emergency response ecosystem.

---

# ✨ Core Features

## 🧠 Hybrid AI Triage Engine

* Symptom analysis
* Severity classification
* Confidence scoring
* Explainable AI reasoning
* Emergency categorization

### Severity Levels

* 🟢 GREEN — Stable
* 🟡 YELLOW — Moderate
* 🟠 ORANGE — Urgent
* 🔴 RED — Critical

---

## 🏥 Smart Hospital Routing

PulsePath AI intelligently recommends hospitals based on:

* Distance
* ETA
* ICU availability
* Specialty support
* Hospital load
* Emergency type
* Queue status

---

## 🚑 Real-Time Emergency Coordination

* Live emergency alerts
* Ambulance tracking
* Telemetry streaming
* Hospital dashboard synchronization
* ETA updates
* Capacity updates

---

## 📡 Simulated IoT Telemetry

Real-time patient vitals simulation:

* Heart rate
* Oxygen saturation
* Blood pressure
* Emergency deterioration alerts

---

## 👥 Role-Based Access Control (RBAC)

### Roles

* Patient
* Hospital Staff
* Doctor
* Ambulance Driver
* Super Admin

---

## 📊 Operational Dashboards

* Live emergency queue
* Analytics dashboard
* Hospital resource management
* Emergency heatmaps
* Severity trends
* Ambulance monitoring

---

# 🛠 Tech Stack

## Frontend

* React + Vite
* TailwindCSS
* Framer Motion
* Zustand
* Recharts
* Socket.IO Client
* Leaflet Maps

## Backend

* Node.js
* Express.js
* Prisma ORM
* PostgreSQL
* Socket.IO
* JWT Authentication

## AI

* Gemini API
* Hybrid Rule-Based Triage Engine

---

# 📂 Project Structure

```bash
PulsePathAI/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── routes/
│   │   └── services/
│
├── server/
│   ├── prisma/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── utils/
```

---

# ⚙️ Environment Variables

## Server `.env`

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pulsepath"

JWT_SECRET="pulsepath_secret"
REFRESH_TOKEN_SECRET="pulsepath_refresh"

GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

PORT=5000
CLIENT_URL="http://localhost:5173"
```

---

## Client `.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

# 🚀 Local Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/ashishparihar965/HACKXCELERATE_PROJECT.git
```

---

## 2️⃣ Backend Setup

```bash
cd server

npm install

npx prisma generate

npx prisma db push

npm run db:seed

npm run dev
```

Backend runs on:

```bash
http://localhost:5000
```

---

## 3️⃣ Frontend Setup

Open second terminal:

```bash
cd client

npm install

npm run dev
```

Frontend runs on:

```bash
http://localhost:5173
```

---

# 🗄 Database Setup

Install PostgreSQL and create database:

```sql
CREATE DATABASE pulsepath;
```

---

# 🔥 Demo Flow

## Emergency Scenario

1. Patient enters symptoms
2. AI triage engine analyzes risk
3. Severity classification generated
4. Smart hospital routing activates
5. Ambulance assigned
6. Live telemetry streams to hospital dashboard
7. Hospital prepares emergency response

---

# 📡 Real-Time Features

* Socket.IO emergency alerts
* Live telemetry streaming
* Real-time hospital occupancy
* Ambulance ETA tracking
* Dashboard synchronization

---

# 📈 Analytics

* Emergency severity trends
* Hospital occupancy rates
* Active emergency monitoring
* Response time analysis
* Critical case heatmaps

---

# 🔒 Security Features

* JWT Authentication
* Refresh Tokens
* RBAC Middleware
* Protected Routes
* API Validation
* Error Handling

---

# 🧪 Demo Accounts

## Admin

```text
Email: admin@pulsepath.ai
Password: pulsepath123
```

## Doctor

```text
Email: doctor@pulsepath.ai
Password: pulsepath123
```

## Patient

```text
Email: patient@pulsepath.ai
Password: pulsepath123
```

---

# 🎯 Hackathon Highlights

✅ Hybrid AI Architecture
✅ Smart Hospital Routing
✅ Real-Time Telemetry
✅ Explainable AI
✅ Premium UI/UX
✅ Operational Dashboards
✅ Role-Based System
✅ Socket.IO Realtime Infrastructure

---

# 🚧 Future Scope

* Real IoT Device Integration
* AI Predictive Emergency Modeling
* Multi-language Voice Assistant
* Government Emergency Network Integration
* Ambulance GPS APIs
* Medical OCR & Document Intelligence

---

# 👨‍💻 Team

Built for **HackXcelerate 2K26** 🚀

---

# 📜 License

MIT License

---

# 💙 PulsePath AI

> Smarter Triage. Faster Response. Better Outcomes.
