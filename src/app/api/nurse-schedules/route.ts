import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BedStatus } from '@prisma/client';

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
    const { bedId, nurseId, startTime, endTime, notes, schedules } = body;

    // Check if it's a batch creation
    if (schedules && Array.isArray(schedules)) {
      const createdSchedules = [];
      const now = new Date();
      let updatedBedStatus: BedStatus | null = null;

      for (const item of schedules) {
        const { startTime: itemStart, endTime: itemEnd, shift: itemShift, notes: itemNotes } = item;
        const start = new Date(itemStart);
        const end = new Date(itemEnd);

        if (start >= end) {
          continue;
        }

        let finalShift = itemShift;
        if (!finalShift) {
          const jktString = start.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
          const jktDate = new Date(jktString);
          const localHour = jktDate.getHours();
          const localMinute = jktDate.getMinutes();
          const totalMins = localHour * 60 + localMinute;
          if (totalMins >= 6 * 60 + 30 && totalMins < 12 * 60 + 30) {
            finalShift = 'MORNING';
          } else if (totalMins >= 12 * 60 + 30 && totalMins < 17 * 60 + 30) {
            finalShift = 'DAY';
          } else {
            finalShift = 'NIGHT';
          }
        }

        const schedule = await prisma.nurseSchedule.create({
          data: {
            bedId,
            nurseId,
            startTime: start,
            endTime: end,
            shift: finalShift,
            notes: itemNotes || notes,
          }
        });
        createdSchedules.push(schedule);

        if (now >= start && now <= end) {
          // Fetch user role
          const user = await prisma.user.findUnique({ where: { id: nurseId } });
          if (user) {
            updatedBedStatus = user.role === 'TECHNICIAN' ? 'MAINTENANCE' : 'OCCUPIED';
          }
        }
      }

      if (updatedBedStatus) {
        await prisma.bed.update({
          where: { id: bedId },
          data: { status: updatedBedStatus }
        });
      }

      return NextResponse.json(createdSchedules, { status: 201 });
    }

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

    // Determine shift if not provided
    let shiftVal = body.shift;
    if (!shiftVal) {
      const jktString = start.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const jktDate = new Date(jktString);
      const localHour = jktDate.getHours();
      const localMinute = jktDate.getMinutes();
      const totalMins = localHour * 60 + localMinute;
      if (totalMins >= 6 * 60 + 30 && totalMins < 12 * 60 + 30) {
        shiftVal = 'MORNING';
      } else if (totalMins >= 12 * 60 + 30 && totalMins < 17 * 60 + 30) {
        shiftVal = 'DAY';
      } else {
        shiftVal = 'NIGHT';
      }
    }

    const schedule = await prisma.nurseSchedule.create({
      data: {
        bedId,
        nurseId,
        startTime: start,
        endTime: end,
        shift: shiftVal,
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
