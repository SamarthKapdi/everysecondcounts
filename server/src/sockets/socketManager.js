const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prismaClient');

// In-memory presence tracking
const onlineUsers = new Map(); // userId -> { socketId, role, name }

const initSocketIO = (server) => {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim());
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. SocketManager cannot start.');
  }

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.user = null;
      return next();
    }
    try {
      if (!process.env.JWT_SECRET) return next(new Error('Authentication error: Missing secret'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`📡 Socket Connected: ${socket.id} ${user ? `(${user.role}: ${user.name || user.id})` : '(anonymous)'}`);

    // Auto-join role-based rooms if authenticated
    if (user?.role) {
      socket.join(user.role);
      console.log(`   → Joined role room: ${user.role}`);

      // Track presence
      onlineUsers.set(user.id, {
        socketId: socket.id,
        role: user.role,
        name: user.name || 'User',
      });

      // Notify others of online status
      io.emit('user:online', { userId: user.id, role: user.role, name: user.name });
    }

    // Manual room join (for emergency-specific or consultation rooms)
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`   → ${socket.id} joined room: ${room}`);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      console.log(`   → ${socket.id} left room: ${room}`);
    });

    // ─── SOS ALERTS ───
    socket.on('trigger_sos', (data) => {
      console.log('🚨 SOS Triggered:', data);
      io.to('HOSPITAL_STAFF').emit('emergency_alert', data);
      io.to('DOCTOR').emit('emergency_alert', data);
      io.to('SUPER_ADMIN').emit('emergency_alert', data);
    });

    // ─── CONSULTATION FLOW ───
    socket.on('consultation:request', (data) => {
      try {
        if (!data || !data.doctorId) {
          socket.emit('error', { message: 'Invalid consultation request format' });
          return;
        }
        console.log(`[Socket] Consultation request from ${socket.user.id} to doctor ${data.doctorId}`);
        
        // Check if doctor is actually online
        let doctorOnline = false;
        onlineUsers.forEach((val, key) => {
          if (key === data.doctorId) doctorOnline = true;
        });

        if (!doctorOnline) {
          socket.emit('error', { message: 'Doctor is currently offline' });
          return;
        }

        // Relay to the specific doctor
        io.to(`user_${data.doctorId}`).emit('consultation:incoming', {
          patientId: socket.user.id,
          patientName: data.patientName || 'A Patient',
          timestamp: new Date()
        });
      } catch (error) {
        console.error('[Socket] Consultation request error:', error);
        socket.emit('error', { message: 'Failed to process consultation request' });
      }
    });

    socket.on('consultation:accept', async (data) => {
      // data: { consultationId, doctorName }
      console.log('✅ Consultation accepted:', data);
      const roomId = `consultation:${data.consultationId}`;
      socket.join(roomId);

      // Update DB status
      try {
        await prisma.consultation.update({
          where: { id: data.consultationId },
          data: {
            status: 'ACTIVE',
            doctorId: user?.id,
            doctorName: data.doctorName || user?.name || 'Doctor',
          },
        });
        console.log('   → Consultation accepted in DB:', data.consultationId);
      } catch (err) {
        console.error('   → Error updating consultation in DB:', err.message);
      }

      // Notify everyone in the room that the doctor has accepted
      io.to(roomId).emit('consultation:accepted', {
        consultationId: data.consultationId,
        doctorId: user?.id,
        doctorName: data.doctorName || user?.name || 'Doctor',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('consultation:message', (data) => {
      // data: { consultationId, message, senderName, senderRole }
      const roomId = `consultation:${data.consultationId}`;
      io.to(roomId).emit('consultation:message', {
        ...data,
        senderId: user?.id,
        senderName: data.senderName || user?.name,
        senderRole: data.senderRole || user?.role,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('consultation:typing', (data) => {
      // data: { consultationId, isTyping }
      const roomId = `consultation:${data.consultationId}`;
      socket.to(roomId).emit('consultation:typing', {
        userId: user?.id,
        name: user?.name,
        isTyping: data.isTyping,
      });
    });

    socket.on('consultation:end', async (data) => {
      const roomId = `consultation:${data.consultationId}`;

      // Update DB status
      try {
        await prisma.consultation.update({
          where: { id: data.consultationId },
          data: { status: 'COMPLETED' },
        });
        console.log('   → Consultation ended in DB:', data.consultationId);
      } catch (err) {
        console.error('   → Error ending consultation in DB:', err.message);
      }

      io.to(roomId).emit('consultation:ended', {
        consultationId: data.consultationId,
        endedBy: user?.name,
        timestamp: new Date().toISOString(),
      });
    });

    // ─── AMBULANCE TRACKING ───
    socket.on('update_ambulance_location', (data) => {
      io.to(`emergency_${data.emergencyId}`).emit('eta_update', data);
    });

    // ─── HOSPITAL CAPACITY ───
    socket.on('hospital_capacity_change', (data) => {
      socket.broadcast.emit('hospital_capacity_update', data);
    });

    // ─── PRESENCE ───
    socket.on('get_online_doctors', (callback) => {
      const doctors = [];
      onlineUsers.forEach((val, key) => {
        if (val.role === 'DOCTOR') {
          doctors.push({ userId: key, name: val.name, online: true });
        }
      });
      if (typeof callback === 'function') callback(doctors);
    });

    // ─── DISCONNECT ───
    socket.on('disconnect', () => {
      console.log(`📡 Socket Disconnected: ${socket.id}`);
      if (user?.id) {
        onlineUsers.delete(user.id);
        io.emit('user:offline', { userId: user.id, role: user.role });
      }
    });
  });

  return io;
};

module.exports = { initSocketIO };
