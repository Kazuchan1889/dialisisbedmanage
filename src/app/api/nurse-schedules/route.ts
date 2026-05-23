import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const floor = searchParams.get('floor');
  const dateStr = searchParams.get('date'); // YYYY-MM-DD
  const search = searchParams.get('search');

  const where: any = {};

  if (floor) {
    where.bed = { floor: parseInt(floor) };
  }

  // Date filter (schedules overlapping or occurring on the selected date)
  if (dateStr) {
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    
    where.AND = [
      {
        startTime: { lte: endOfDay }
      },
      {
        endTime: { gte: startOfDay }
      }
    ];
  }

  if (search) {
    where.OR = [
      {
        nurse: {
          name: { contains: search, mode: 'insensitive' },
        },
      },
      {
        bed: {
          bedCode: { contains: search, mode: 'insensitive' },
        },
      },
    ];
  }

  try {
    const schedules = await prisma.nurseSchedule.findMany({
      where,
      include: {
        nurse: {
          select: { id: true, name: true, username: true, role: true },
        },
        bed: {
          select: { id: true, bedCode: true, floor: true, section: true },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json(schedules);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { bedId, nurseId, startTime, endTime, notes } = body;

    if (!bedId || !nurseId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    // Fetch user to check role
    const user = await prisma.user.findUnique({
      where: { id: nurseId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const schedule = await prisma.nurseSchedule.create({
      data: {
        bedId,
        nurseId,
        startTime: start,
        endTime: end,
        notes,
      },
      include: {
        nurse: {
          select: { id: true, name: true, role: true },
        },
        bed: {
          select: { id: true, bedCode: true },
        },
      },
    });

    // Auto-update bed status if the schedule is currently active
    const now = new Date();
    if (now >= start && now <= end) {
      const newBedStatus = user.role === 'TECHNICIAN' ? 'MAINTENANCE' : 'OCCUPIED';
      await prisma.bed.update({
        where: { id: bedId },
        data: { status: newBedStatus }
      });
    }

    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
