const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');
const { ROLES } = require('../middleware/auth');

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'pulsepath-fallback-secret-key-1234',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'pulsepath-refresh-fallback-secret-5678',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return next(new AppError('Please provide name, email, and password', 400));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError('Email already registered', 409));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Always force PATIENT role on public registration to prevent unauthorized elevation
    const assignedRole = ROLES.PATIENT;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: assignedRole,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      }
    });

    const accessToken = signToken(user);
    const refreshToken = signRefreshToken(user);

    res.status(201).json({
      status: 'success',
      tokens: { accessToken, refreshToken },
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isDeleted) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    const accessToken = signToken(user);
    const refreshToken = signRefreshToken(user);

    // Filter out passwordHash for response
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      status: 'success',
      tokens: { accessToken, refreshToken },
      data: { user: safeUser },
    });
  } catch (error) {
    next(error);
  }
};

// Refresh Token
exports.refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return next(new AppError('Refresh token required', 400));

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'pulsepath-refresh-fallback-secret-5678');
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.isDeleted) {
      return next(new AppError('User no longer exists', 401));
    }

    const accessToken = signToken(user);
    res.json({
      status: 'success',
      tokens: { accessToken }
    });
  } catch (error) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, languagePref: true, createdAt: true }
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// Update profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, languagePref, avatarUrl } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        languagePref: languagePref !== undefined ? languagePref : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
      },
      select: { id: true, name: true, email: true, role: true, phone: true, languagePref: true, avatarUrl: true }
    });

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// Get all doctors (public for consultation listing)
exports.getDoctors = async (req, res, next) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR', isDeleted: false },
      select: {
        id: true,
        name: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    res.json({
      status: 'success',
      data: { doctors },
    });
  } catch (error) {
    next(error);
  }
};
