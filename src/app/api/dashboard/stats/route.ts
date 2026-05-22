import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // We execute only 2 aggregate queries sequentially to minimize connection usage
    const bedGroups = await prisma.bed.groupBy({
      by: ['floor', 'status'],
      _count: {
        id: true,
      },
    });

    const machineGroups = await prisma.machine.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    let totalBeds = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;
    let maintenanceBeds = 0;
    let floor2Total = 0;
    let floor2Occupied = 0;
    let floor3Total = 0;
    let floor3Occupied = 0;

    for (const group of bedGroups) {
      const count = group._count.id;
      totalBeds += count;

      if (group.status === 'OCCUPIED') {
        occupiedBeds += count;
      } else if (group.status === 'AVAILABLE') {
        availableBeds += count;
      } else if (group.status === 'MAINTENANCE') {
        maintenanceBeds += count;
      }

      if (group.floor === 2) {
        floor2Total += count;
        if (group.status === 'OCCUPIED') {
          floor2Occupied += count;
        }
      } else if (group.floor === 3) {
        floor3Total += count;
        if (group.status === 'OCCUPIED') {
          floor3Occupied += count;
        }
      }
    }

    let totalMachines = 0;
    let machineMaintenance = 0;

    for (const group of machineGroups) {
      const count = group._count.id;
      totalMachines += count;
      if (group.status === 'MAINTENANCE') {
        machineMaintenance += count;
      }
    }

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
  } catch (error: any) {
    console.error('[API Stats Error]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
