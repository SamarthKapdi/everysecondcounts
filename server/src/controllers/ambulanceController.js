const prisma = require('../config/prismaClient');
const AppError = require('../utils/AppError');

exports.getAllAmbulances = async (req, res, next) => {
  try {
    const ambulances = await prisma.ambulance.findMany({
      include: {
        driver: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    });

    const formatted = ambulances.map(amb => ({
      id: amb.vehicleNumber,
      status: amb.status,
      driver: amb.driver?.name || 'Unassigned',
      location: `${amb.currentLat}, ${amb.currentLng}`,
      vehicle: amb.vehicleNumber,
      lastUpdate: 'Just now'
    }));

    res.json({
      status: 'success',
      data: { ambulances: formatted }
    });
  } catch (error) {
    next(new AppError('Failed to fetch ambulances', 500));
  }
};
