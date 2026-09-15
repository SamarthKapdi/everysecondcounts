import { create } from 'zustand';

const useTelemetryStore = create((set) => ({
  currentVitals: null,
  ecgWaveform: [],
  alerts: [],
  isStreaming: false,

  updateVitals: (snapshot) => set({
    currentVitals: snapshot.vitals,
    ecgWaveform: snapshot.ecgWaveform || [],
    alerts: snapshot.alerts || [],
    isStreaming: true,
  }),

  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 20),
  })),

  clearTelemetry: () => set({
    currentVitals: null,
    ecgWaveform: [],
    alerts: [],
    isStreaming: false,
  }),
}));

export default useTelemetryStore;
