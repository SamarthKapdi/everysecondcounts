import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useEmergencyStore from '../store/emergencyStore';
import useNotificationStore from '../store/notificationStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export const getSocket = () => socketInstance;

/**
 * Force reconnect the socket with the current auth token.
 * Call this after login to ensure the DOCTOR/ADMIN rooms are joined.
 */
export const reconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const useSocket = () => {
  const socketRef = useRef(null);
  const addEmergency = useEmergencyStore(s => s.addEmergency);
  const updateEmergency = useEmergencyStore(s => s.updateEmergency);
  const addNotification = useNotificationStore(s => s.addNotification);

  useEffect(() => {
    // Get auth token for socket authentication
    const token = localStorage.getItem('pulsepath-token');

    // If socket already exists and has the same token, reuse it
    if (socketInstance && socketInstance.connected) {
      socketRef.current = socketInstance;
      return;
    }

    // Clean up old socket if it exists
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token: token || undefined },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('📡 Socket connected:', socket.id, token ? '(authenticated)' : '(anonymous)');
    });

    // ─── EMERGENCY EVENTS ───
    socket.on('emergency_alert', (data) => {
      addEmergency(data);
      addNotification({
        id: Date.now(),
        title: '🚨 New Emergency',
        message: `Severity: ${data.severity} — ${data.symptoms?.join?.(', ') || 'SOS'}`,
        type: 'ALERT',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('emergency_updated', (data) => {
      updateEmergency(data);
    });

    // ─── CONSULTATION EVENTS ───
    socket.on('consultation:incoming', (data) => {
      addNotification({
        id: Date.now(),
        title: '💬 Consultation Request',
        message: `${data.patientName} is requesting a consultation`,
        type: 'INFO',
        timestamp: data.timestamp,
      });
    });

    socket.on('consultation:accepted', (data) => {
      const doctorLabel = (data.doctorName || 'Doctor').startsWith('Dr.')
        ? data.doctorName
        : `Dr. ${data.doctorName || 'Doctor'}`;
      addNotification({
        id: Date.now(),
        title: '✅ Consultation Accepted',
        message: `${doctorLabel} has accepted your consultation`,
        type: 'INFO',
        timestamp: data.timestamp,
      });
    });

    // ─── HOSPITAL CAPACITY ───
    socket.on('hospital_capacity_update', (data) => {
      addNotification({
        id: Date.now(),
        title: 'Hospital Update',
        message: `${data.name}: ${data.availableBeds} beds available (${data.currentLoad}% load)`,
        type: 'INFO',
        timestamp: new Date().toISOString(),
      });
    });

    // ─── PRESENCE ───
    socket.on('user:online', () => {});
    socket.on('user:offline', () => {});

    socket.on('disconnect', () => {
      console.log('📡 Socket disconnected');
    });

    socketInstance = socket;
    socketRef.current = socket;

    // Don't disconnect on unmount — persistent connection
    return () => {};
  }, [addEmergency, updateEmergency, addNotification]);

  const emit = useCallback((event, data, callback) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.emit(event, data, callback);
      } else {
        socketRef.current.emit(event, data);
      }
    }
  }, []);

  const joinRoom = useCallback((room) => {
    if (socketRef.current) socketRef.current.emit('join_room', room);
  }, []);

  const leaveRoom = useCallback((room) => {
    if (socketRef.current) socketRef.current.emit('leave_room', room);
  }, []);

  const onEvent = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
      socketRef.current.on(event, handler);
    }
    return () => {
      if (socketRef.current) socketRef.current.off(event, handler);
    };
  }, []);

  return { socket: socketRef.current, emit, joinRoom, leaveRoom, onEvent };
};
