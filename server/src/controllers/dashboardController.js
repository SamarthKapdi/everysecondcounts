const prisma = require('../config/prismaClient');

// Get dashboard stats
exports.getStats = async (req, res, next) => {
  try {
    const [totalCases, criticalCases, hospitals, recentCases] = await Promise.all([
      prisma.emergencyCase.count(),
      prisma.emergencyCase.count({ where: { severity: 'RED', status: { in: ['PENDING', 'DISPATCHED'] } } }),
      prisma.hospital.aggregate({
        where: { isActive: true },
        _count: true,
        _sum: { availableBeds: true },
      }),
      prisma.emergencyCase.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { name: true, phone: true } },
          hospital: { select: { name: true } },
        },
      }),
    ]);

    const ambulances = await prisma.ambulance.count({ where: { status: 'AVAILABLE' } });

    res.json({
      status: 'success',
      data: {
        totalEmergencies: totalCases,
        criticalPatients: criticalCases,
        totalHospitals: hospitals._count,
        availableBeds: hospitals._sum.availableBeds || 0,
        activeAmbulances: ambulances,
        recentCases,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get emergency trends (last 7 days) — works with Prisma raw query for grouping
// NOTE: This query uses PostgreSQL-specific syntax (COUNT(*) FILTER (WHERE ...) and ::int cast).
// It will NOT run on MySQL or SQLite. Every Second Counts is committed to PostgreSQL as its database.
exports.getTrends = async (req, res, next) => {
  try {
    const trends = await prisma.$queryRaw`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE severity = 'RED')::int as critical,
        COUNT(*) FILTER (WHERE severity = 'ORANGE')::int as urgent,
        COUNT(*) FILTER (WHERE severity = 'YELLOW')::int as moderate,
        COUNT(*) FILTER (WHERE severity = 'GREEN')::int as low
      FROM "EmergencyCase"
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    res.json({
      status: 'success',
      data: { trends },
    });
  } catch (error) {
    next(error);
  }
};

// Get severity distribution
exports.getSeverityDistribution = async (req, res, next) => {
  try {
    const distribution = await prisma.emergencyCase.groupBy({
      by: ['severity'],
      _count: { severity: true },
    });

    const formatted = distribution.map(d => ({
      severity: d.severity,
      count: d._count.severity,
    }));

    res.json({
      status: 'success',
      data: { distribution: formatted },
    });
  } catch (error) {
    next(error);
  }
};

// Get hospital occupancy overview
exports.getOccupancy = async (req, res, next) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      where: { isActive: true },
      select: { id: true, name: true, availableBeds: true, currentLoad: true, hasICU: true },
      orderBy: { currentLoad: 'desc' },
    });

    res.json({
      status: 'success',
      data: { occupancy: hospitals },
    });
  } catch (error) {
    next(error);
  }
};
