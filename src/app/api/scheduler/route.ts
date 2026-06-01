import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const floorParam = searchParams.get('floor');

  const bedWhere: any = {};
  if (floorParam && floorParam !== 'all') {
    bedWhere.floor = parseInt(floorParam);
  }

  // Fetch schedules that overlap with the selected date (UTC range)
  // Use a ±1 day buffer to handle night shifts spanning midnight
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay   = new Date(`${dateStr}T23:59:59.999Z`);

  try {
    const beds = await prisma.bed.findMany({
      where: bedWhere,
      include: {
        machine: {
          select: { id: true, machineCode: true, status: true },
        },
        nurseSchedules: {
          where: {
            AND: [
              { startTime: { lte: endOfDay } },
              { endTime:   { gte: startOfDay } },
            ],
          },
          include: {
            nurse: {
              select: { id: true, name: true, role: true, username: true },
            },
          },
          orderBy: { startTime: 'asc' },
        },
        patientSchedules: {
          where: {
            AND: [
              { startTime: { lte: endOfDay } },
              { endTime:   { gte: startOfDay } },
            ],
          },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: [{ floor: 'asc' }, { section: 'asc' }, { position: 'asc' }],
    });

    return NextResponse.json(beds);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
