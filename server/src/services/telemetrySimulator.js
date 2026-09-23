/**
 * Every Second Counts — IoT-Style Telemetry Simulator
 * Generates realistic patient vital signs streamed via Socket.IO.
 * No actual hardware — simulates believable medical telemetry for demo purposes.
 */

// Baseline vital ranges for different severity levels
const VITAL_PROFILES = {
  RED: {
    heartRate: { base: 120, variance: 25, trend: 'unstable' },
    oxygenSaturation: { base: 85, variance: 8, trend: 'declining' },
    systolicBP: { base: 180, variance: 30, trend: 'unstable' },
    diastolicBP: { base: 110, variance: 15, trend: 'unstable' },
    temperature: { base: 39.5, variance: 1.2, trend: 'rising' },
    respiratoryRate: { base: 28, variance: 8, trend: 'unstable' },
  },
  ORANGE: {
    heartRate: { base: 105, variance: 15, trend: 'elevated' },
    oxygenSaturation: { base: 91, variance: 4, trend: 'low' },
    systolicBP: { base: 150, variance: 20, trend: 'elevated' },
    diastolicBP: { base: 95, variance: 10, trend: 'elevated' },
    temperature: { base: 38.5, variance: 0.8, trend: 'elevated' },
    respiratoryRate: { base: 22, variance: 5, trend: 'elevated' },
  },
  YELLOW: {
    heartRate: { base: 88, variance: 10, trend: 'normal' },
    oxygenSaturation: { base: 95, variance: 2, trend: 'normal' },
    systolicBP: { base: 130, variance: 12, trend: 'normal' },
    diastolicBP: { base: 85, variance: 8, trend: 'normal' },
    temperature: { base: 37.8, variance: 0.5, trend: 'normal' },
    respiratoryRate: { base: 18, variance: 3, trend: 'normal' },
  },
  GREEN: {
    heartRate: { base: 72, variance: 8, trend: 'stable' },
    oxygenSaturation: { base: 98, variance: 1, trend: 'stable' },
    systolicBP: { base: 120, variance: 8, trend: 'stable' },
    diastolicBP: { base: 78, variance: 5, trend: 'stable' },
    temperature: { base: 36.8, variance: 0.3, trend: 'stable' },
    respiratoryRate: { base: 16, variance: 2, trend: 'stable' },
  },
};

/**
 * Generate a single simulated vital reading with realistic fluctuation
 */
const generateVitalReading = (config) => {
  const fluctuation = (Math.random() - 0.5) * 2 * config.variance;
  return Math.round((config.base + fluctuation) * 10) / 10;
};

/**
 * Generate a full telemetry snapshot for a given severity level
 */
const generateTelemetrySnapshot = (severity = 'YELLOW', emergencyId = null) => {
  const profile = VITAL_PROFILES[severity] || VITAL_PROFILES.YELLOW;

  const heartRate = Math.round(generateVitalReading(profile.heartRate));
  const oxygenSaturation = Math.min(100, Math.max(60, Math.round(generateVitalReading(profile.oxygenSaturation))));
  const systolicBP = Math.round(generateVitalReading(profile.systolicBP));
  const diastolicBP = Math.round(generateVitalReading(profile.diastolicBP));
  const temperature = generateVitalReading(profile.temperature);
  const respiratoryRate = Math.round(generateVitalReading(profile.respiratoryRate));

  // Detect alert conditions
  const alerts = [];
  if (heartRate > 130) alerts.push({ type: 'CRITICAL', message: 'Tachycardia detected — HR exceeds 130 bpm' });
  if (heartRate < 50) alerts.push({ type: 'CRITICAL', message: 'Bradycardia detected — HR below 50 bpm' });
  if (oxygenSaturation < 90) alerts.push({ type: 'CRITICAL', message: `Hypoxemia — SpO2 at ${oxygenSaturation}%` });
  if (systolicBP > 180) alerts.push({ type: 'WARNING', message: 'Hypertensive crisis — SBP exceeds 180' });
  if (temperature > 39.5) alerts.push({ type: 'WARNING', message: `High fever — ${temperature}°C` });
  if (respiratoryRate > 25) alerts.push({ type: 'WARNING', message: 'Tachypnea — respiratory rate elevated' });

  // Simulated ECG waveform (simplified sine-based pattern)
  const ecgWaveform = Array.from({ length: 50 }, (_, i) => {
    const t = i / 50;
    // P wave + QRS complex + T wave simulation
    const pWave = 0.15 * Math.sin(2 * Math.PI * t * 3);
    const qrs = (t > 0.35 && t < 0.45) ? 1.2 * Math.sin(2 * Math.PI * (t - 0.35) * 10) : 0;
    const tWave = 0.3 * Math.sin(2 * Math.PI * (t - 0.5) * 2);
    const noise = (Math.random() - 0.5) * 0.05;
    return Math.round((pWave + qrs + tWave + noise) * 100) / 100;
  });

  return {
    emergencyId,
    timestamp: new Date().toISOString(),
    vitals: {
      heartRate: { value: heartRate, unit: 'bpm', trend: profile.heartRate.trend },
      oxygenSaturation: { value: oxygenSaturation, unit: '%', trend: profile.oxygenSaturation.trend },
      bloodPressure: { systolic: systolicBP, diastolic: diastolicBP, unit: 'mmHg', trend: profile.systolicBP.trend },
      temperature: { value: temperature, unit: '°C', trend: profile.temperature.trend },
      respiratoryRate: { value: respiratoryRate, unit: 'breaths/min', trend: profile.respiratoryRate.trend },
    },
    ecgWaveform,
    alerts,
    isStable: alerts.length === 0,
    deteriorationRisk: severity === 'RED' ? 'HIGH' : severity === 'ORANGE' ? 'MODERATE' : 'LOW',
  };
};

const activeStreams = new Map();

/**
 * Start a simulated telemetry stream for an emergency via Socket.IO
 * Emits vitals every 3 seconds to the emergency-specific room
 */
const startTelemetryStream = (io, emergencyId, severity = 'YELLOW') => {
  const intervalId = setInterval(() => {
    const snapshot = generateTelemetrySnapshot(severity, emergencyId);
    io.to(`emergency_${emergencyId}`).emit('telemetry_update', snapshot);

    // Emit critical alerts to all staff
    if (snapshot.alerts.length > 0) {
      io.to('HOSPITAL_STAFF').emit('vital_alert', {
        emergencyId,
        alerts: snapshot.alerts,
        timestamp: snapshot.timestamp,
      });
    }
  }, 3000);

  activeStreams.set(emergencyId, intervalId);
  return intervalId;
};

/**
 * Stop a telemetry stream
 */
const stopTelemetryStream = (emergencyId) => {
  const intervalId = activeStreams.get(emergencyId);
  if (intervalId) {
    clearInterval(intervalId);
    activeStreams.delete(emergencyId);
  }
};

module.exports = { generateTelemetrySnapshot, startTelemetryStream, stopTelemetryStream, VITAL_PROFILES };
