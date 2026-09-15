-- MediNova AI Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient', 'responder')),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  language_pref VARCHAR(10) DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hospitals table
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  total_beds INTEGER DEFAULT 0,
  available_beds INTEGER DEFAULT 0,
  icu_available BOOLEAN DEFAULT false,
  icu_beds_total INTEGER DEFAULT 0,
  icu_beds_available INTEGER DEFAULT 0,
  ambulance_count INTEGER DEFAULT 0,
  emergency_contact VARCHAR(20),
  rating DECIMAL(2, 1) DEFAULT 0.0,
  specialties TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Cases table
CREATE TABLE emergency_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'moderate', 'low')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  symptoms TEXT[] DEFAULT '{}',
  ai_diagnosis TEXT,
  recommended_action TEXT,
  probable_conditions JSONB DEFAULT '[]',
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'transferred', 'pending')),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Symptoms reference table
CREATE TABLE symptoms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  severity_weight INTEGER DEFAULT 1 CHECK (severity_weight >= 1 AND severity_weight <= 10),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES emergency_cases(id) ON DELETE SET NULL,
  report_type VARCHAR(50) DEFAULT 'emergency',
  title VARCHAR(200),
  content TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ambulances table
CREATE TABLE ambulances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  vehicle_number VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'dispatched', 'returning', 'maintenance')),
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_emergency_cases_patient ON emergency_cases(patient_id);
CREATE INDEX idx_emergency_cases_severity ON emergency_cases(severity);
CREATE INDEX idx_emergency_cases_status ON emergency_cases(status);
CREATE INDEX idx_emergency_cases_created ON emergency_cases(created_at);
CREATE INDEX idx_hospitals_active ON hospitals(is_active);
CREATE INDEX idx_ambulances_status ON ambulances(status);
CREATE INDEX idx_ambulances_hospital ON ambulances(hospital_id);
