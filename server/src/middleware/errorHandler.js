const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error('ERROR 💥:', err.message);

  if (err.code === '23505') {
    return res.status(409).json({
      status: 'fail',
      message: 'Duplicate field value. This record already exists.',
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      status: 'fail',
      message: 'Referenced record does not exist.',
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Token expired. Please log in again.',
    });
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.isOperational ? err.message : 'Something went wrong!',
  });
};

module.exports = { errorHandler };
