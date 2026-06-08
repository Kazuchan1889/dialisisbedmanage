import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/queue?category=POLI&date=2026-06-06
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'POLI';
    const dateStr = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    // Build date range for the day (Jakarta time)
    const dayStart = new Date(dateStr + 'T00:00:00+07:00');
    const dayEnd = new Date(dateStr + 'T23:59:59.999+07:00');

    const tickets = await prisma.queueTicket.findMany({
      where: {
        category: category as any,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { queueNumber: 'asc' },
    });

    return NextResponse.json({ tickets });
  } catch (err: any) {
    console.error('GET /api/queue error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/queue  body: { category, patientName? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, patientName } = body;

    if (!category || !['POLI', 'DIALISIS', 'OBAT'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Get today's date range in Jakarta time
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const dayStart = new Date(todayStr + 'T00:00:00+07:00');
    const dayEnd = new Date(todayStr + 'T23:59:59.999+07:00');

    // Find the max queue number for this category today
    const lastTicket = await prisma.queueTicket.findFirst({
      where: {
        category: category as any,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { queueNumber: 'desc' },
    });

    const nextNumber = (lastTicket?.queueNumber || 0) + 1;

    const ticket = await prisma.queueTicket.create({
      data: {
        category: category as any,
        queueNumber: nextNumber,
        patientName: patientName || null,
        status: 'WAITING',
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/queue error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
