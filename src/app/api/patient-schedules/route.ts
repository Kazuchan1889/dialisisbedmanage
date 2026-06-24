import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncBedState } from '@/lib/bedSync';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bedId  = searchParams.get('bedId');
  const dateStr = searchParams.get('date');
  const floor  = searchParams.get('floor');

  const where: any = {};
  if (bedId) where.bedId = bedId;

  if (dateStr) {
    const startOfDay = new Date(`${dateStr}T00:00:00.000+07:00`);
    const endOfDay   = new Date(`${dateStr}T23:59:59.999+07:00`);
    where.AND = [{ startTime: { lte: endOfDay } }, { endTime: { gte: startOfDay } }];
  }

  if (floor && floor !== 'all') {
    where.bed = { floor: parseInt(floor) };
  }

  try {
    const schedules = await prisma.patientSchedule.findMany({
      where,
      include: {
        bed: { select: { id: true, bedCode: true, floor: true, section: true } },
      },
      orderBy: { startTime: 'asc' },
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
    const { bedId, patientId, patientName, sessionType, startDate, endDate, startTime, endTime, notes, dates } = body;

    if (!bedId || !patientId || !patientName || !startDate || !startTime || !endTime) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    let targetDates: string[] = [];

    if (dates && Array.isArray(dates) && dates.length > 0) {
      targetDates = dates;
    } else {
      const sDate = new Date(`${startDate}T12:00:00Z`);
      const eDate = new Date(`${endDate || startDate}T12:00:00Z`);

      if (sDate > eDate) {
        return NextResponse.json({ error: 'Tanggal mulai harus sebelum tanggal selesai' }, { status: 400 });
      }

      const cur = new Date(sDate);
      while (cur <= eDate) {
        targetDates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }

    const created: any[] = [];

    for (const ds of targetDates) {
      // Determine endDate for this day (overnight sessions span to next day)
      const isOvernight = startTime > endTime; // e.g. 21:00 > 07:00
      const endDs = isOvernight
        ? (() => { const d = new Date(`${ds}T12:00:00Z`); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()
        : ds;

      const record = await prisma.patientSchedule.create({
        data: {
          bedId,
          patientId,
          patientName,
          sessionType: sessionType || 'MORNING',
          startTime: new Date(`${ds}T${startTime}:00+07:00`),
          endTime:   new Date(`${endDs}T${endTime}:00+07:00`),
          notes:     notes || null,
        },
        include: {
          bed: { select: { id: true, bedCode: true } },
        },
      });
      created.push(record);
    }

    // Sync the bed's status and occupant immediately
    await syncBedState(bedId);

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    
    if (dateStr) {
      const startOfDay = new Date(`${dateStr}T00:00:00.000+07:00`);
      const endOfDay   = new Date(`${dateStr}T23:59:59.999+07:00`);
      
      await prisma.patientSchedule.deleteMany({
        where: {
          AND: [
            { startTime: { lte: endOfDay } },
            { endTime: { gte: startOfDay } }
          ]
        }
      });
    } else {
      await prisma.patientSchedule.deleteMany({});
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
