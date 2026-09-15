const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

// Define Role constants directly so they can be exported
const ROLES = {
  PATIENT: 'PATIENT',
  HOSPITAL_STAFF: 'HOSPITAL_STAFF',
  DOCTOR: 'DOCTOR',
  AMBULANCE_DRIVER: 'AMBULANCE_DRIVER',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

const protect = async (req, res, next) => {
  try {
    let token;

    // Check for Bearer token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    // Verify token structure and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pulsepath-fallback-secret-key-1234');
    
    // In a real production setup, we'd also check if the user still exists in DB
    // and if their password was changed recently.
    
    // Attach decoded user info (including role) to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * Usage: router.post('/route', protect, restrictTo(ROLES.DOCTOR, ROLES.SUPER_ADMIN), controller)
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user is guaranteed to be set by the protect middleware
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: You lack the required permissions to perform this action.', 403));
    }
    next();
  };
};

module.exports = { protect, restrictTo, ROLES };
