import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [
    totalBeds,
    occupiedBeds,
    availableBeds,
    maintenanceBeds,
    totalMachines,
    machineMaintenance,
    floor2Occupied,
    floor3Occupied,
    floor2Total,
    floor3Total,
  ] = await Promise.all([
    prisma.bed.count(),
    prisma.bed.count({ where: { status: 'OCCUPIED' } }),
    prisma.bed.count({ where: { status: 'AVAILABLE' } }),
    prisma.bed.count({ where: { status: 'MAINTENANCE' } }),
    prisma.machine.count(),
    prisma.machine.count({ where: { status: 'MAINTENANCE' } }),
    prisma.bed.count({ where: { floor: 2, status: 'OCCUPIED' } }),
    prisma.bed.count({ where: { floor: 3, status: 'OCCUPIED' } }),
    prisma.bed.count({ where: { floor: 2 } }),
    prisma.bed.count({ where: { floor: 3 } }),
  ]);

  return NextResponse.json({
    totalBeds,
    occupiedBeds,
    availableBeds,
    maintenanceBeds,
    totalMachines,
    machineMaintenance,
    floor2: { total: floor2Total, occupied: floor2Occupied, available: floor2Total - floor2Occupied },
    floor3: { total: floor3Total, occupied: floor3Occupied, available: floor3Total - floor3Occupied },
    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
  });
}
