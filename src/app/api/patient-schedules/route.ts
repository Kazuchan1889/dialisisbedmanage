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
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay   = new Date(`${dateStr}T23:59:59.999Z`);
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
    const { bedId, patientId, patientName, sessionType, startDate, endDate, startTime, endTime, notes } = body;

    if (!bedId || !patientId || !patientName || !startDate || !startTime || !endTime) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const sDate = new Date(startDate + 'T00:00:00');
    const eDate = new Date((endDate || startDate) + 'T00:00:00');

    if (sDate > eDate) {
      return NextResponse.json({ error: 'Tanggal mulai harus sebelum tanggal selesai' }, { status: 400 });
    }

    const created: any[] = [];
    const cur = new Date(sDate);

    while (cur <= eDate) {
      const ds = cur.toISOString().split('T')[0];
      // Determine endDate for this day (overnight sessions span to next day)
      const isOvernight = startTime > endTime; // e.g. 21:00 > 07:00
      const endDs = isOvernight
        ? (() => { const d = new Date(cur); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()
        : ds;

      const record = await prisma.patientSchedule.create({
        data: {
          bedId,
          patientId,
          patientName,
          sessionType: sessionType || 'MORNING',
          startTime: new Date(`${ds}T${startTime}:00`),
          endTime:   new Date(`${endDs}T${endTime}:00`),
          notes:     notes || null,
        },
        include: {
          bed: { select: { id: true, bedCode: true } },
        },
      });
      created.push(record);
      cur.setDate(cur.getDate() + 1);
    }

    // Sync the bed's status and occupant immediately
    await syncBedState(bedId);

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
