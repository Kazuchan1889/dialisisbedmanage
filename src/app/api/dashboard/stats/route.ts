import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncAllBedsState } from '@/lib/bedSync';
import { isMachineDamagedOrRepaired } from '@/lib/bedUtils';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const beds = await syncAllBedsState();
    const machines = await prisma.machine.findMany({
      select: {
        status: true,
        notes: true,
      },
    });

    let totalBeds = beds.length;
    let occupiedBeds = 0;
    let availableBeds = 0;
    let maintenanceBeds = 0;

    let floor2Total = 0;
    let floor2Occupied = 0;
    let floor2Available = 0;
    let floor2Maintenance = 0;

    let floor3Total = 0;
    let floor3Occupied = 0;
    let floor3Available = 0;
    let floor3Maintenance = 0;

    for (const bed of beds) {
      const isDamagedOrRepaired = isMachineDamagedOrRepaired(bed.machine);
      const isMaintenance = bed.status === 'MAINTENANCE' || isDamagedOrRepaired;
      const isOccupied = !isMaintenance && bed.status === 'OCCUPIED';
      const isAvailable = !isMaintenance && bed.status === 'AVAILABLE';

      if (isMaintenance) {
        maintenanceBeds++;
      } else if (isOccupied) {
        occupiedBeds++;
      } else if (isAvailable) {
        availableBeds++;
      }

      if (bed.floor === 2) {
        floor2Total++;
        if (isMaintenance) floor2Maintenance++;
        else if (isOccupied) floor2Occupied++;
        else if (isAvailable) floor2Available++;
      } else if (bed.floor === 3) {
        floor3Total++;
        if (isMaintenance) floor3Maintenance++;
        else if (isOccupied) floor3Occupied++;
        else if (isAvailable) floor3Available++;
      }
    }

    let totalMachines = machines.length;
    let machineMaintenance = 0;
    let machineRepaired = 0;

    for (const machine of machines) {
      if (machine.status === 'MAINTENANCE') {
        machineMaintenance++;
      } else if (machine.status === 'AVAILABLE' && machine.notes && machine.notes.startsWith('[REPAIRED]')) {
        machineRepaired++;
      }
    }

    return NextResponse.json({
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      totalMachines,
      machineMaintenance,
      machineRepaired,
      floor2: { total: floor2Total, occupied: floor2Occupied, available: floor2Available, maintenance: floor2Maintenance },
      floor3: { total: floor3Total, occupied: floor3Occupied, available: floor3Available, maintenance: floor3Maintenance },
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

