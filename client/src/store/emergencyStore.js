import { create } from 'zustand';

const useEmergencyStore = create((set) => ({
  emergencies: [],
  currentEmergency: null,
  triageResult: null,
  loading: false,

  setEmergencies: (emergencies) => set({ emergencies }),

  addEmergency: (emergency) => set((state) => ({
    emergencies: [emergency, ...state.emergencies],
  })),

  updateEmergency: (updated) => set((state) => ({
    emergencies: state.emergencies.map(e => e.id === updated.id ? { ...e, ...updated } : e),
  })),

  setCurrentEmergency: (emergency) => set({ currentEmergency: emergency }),

  setTriageResult: (result) => set({ triageResult: result }),

  clearTriageResult: () => set({ triageResult: null }),
}));

export default useEmergencyStore;
