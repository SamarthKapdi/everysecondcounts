const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');

exports.getUsersByRole = async (req, res, next) => {
  try {
    const { role } = req.query;
    if (!role) {
      return next(new AppError('Role parameter is required', 400));
    }

    const users = await prisma.user.findMany({
      where: { role: role }
    });

    let formatted = [];

    if (role === 'DOCTOR') {
      formatted = users.map(user => ({
        id: user.id,
        avatar: user.name.split(' ').map(n => n[0]).join(''),
        name: user.name,
        specialty: 'General Medicine', // Fallback
        rating: '4.8',
        experience: '5+ years',
        online: true
      }));
    } else if (role === 'HOSPITAL_STAFF') {
      formatted = users.map(user => ({
        id: user.id,
        avatar: user.name.split(' ').map(n => n[0]).join(''),
        name: user.name,
        role: 'Nurse / Staff',
        dept: 'Emergency',
        shift: 'Morning',
        status: 'On Duty'
      }));
    } else {
      formatted = users;
    }

    res.json({
      status: 'success',
      data: { users: formatted }
    });
  } catch (error) {
    next(new AppError('Failed to fetch users', 500));
  }
};
