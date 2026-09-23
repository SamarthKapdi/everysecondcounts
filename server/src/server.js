const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const sosRoutes = require('./routes/sosRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const userRoutes = require('./routes/userRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const labRoutes = require('./routes/labRoutes');
const bloodBankRoutes = require('./routes/bloodBankRoutes');
const transplantRoutes = require('./routes/transplantRoutes');
const fundraisingRoutes = require('./routes/fundraisingRoutes');
const http = require('http');
const { initSocketIO } = require('./sockets/socketManager');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = initSocketIO(server);

// Make io accessible via req.app.get('io') in controllers
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/blood-bank', bloodBankRoutes);
app.use('/api/transplants', transplantRoutes);
app.use('/api/fundraising', fundraisingRoutes);

// AI Symptom + Report Analyzer (with multer for file uploads)
const multer = require('multer');
const uploadForSymptoms = multer({ dest: 'uploads/', limits: { fileSize: 15 * 1024 * 1024 } });
app.use('/api/symptoms', (req, res, next) => {
  // Apply multer only for the report-analyze-stream endpoint
  if (req.path === '/report-analyze-stream' && req.method === 'POST') {
    return uploadForSymptoms.single('report')(req, res, next);
  }
  next();
}, symptomRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Every Second Counts API is running', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🏥 Every Second Counts Server running on port ${PORT}`);
  console.log(`📡 Real-time Socket.IO layer initialized`);
});

module.exports = { app, server };
