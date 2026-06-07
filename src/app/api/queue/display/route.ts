import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/queue/display
// Returns called + waiting for ALL categories (Poli, Dialisis, Obat)
export async function GET(req: NextRequest) {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const dayStart = new Date(todayStr + 'T00:00:00+07:00');
    const dayEnd = new Date(todayStr + 'T23:59:59.999+07:00');

    const dateFilter = { gte: dayStart, lte: dayEnd };
    const categories = ['POLI', 'DIALISIS', 'OBAT'] as const;

    const results: Record<string, any> = {};

    for (const cat of categories) {
      const where = { category: cat as any, createdAt: dateFilter };

      const calledTickets = await prisma.queueTicket.findMany({
        where: { ...where, status: { in: ['CALLED', 'SERVING'] } },
        orderBy: { calledAt: 'desc' },
        take: 3,
      });

      const waitingTickets = await prisma.queueTicket.findMany({
        where: { ...where, status: 'WAITING' },
        orderBy: { queueNumber: 'asc' },
        take: 10,
      });

      const completedTickets = await prisma.queueTicket.findMany({
        where: { ...where, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 5,
      });

      const totalToday = await prisma.queueTicket.count({ where });
      const waitingCount = await prisma.queueTicket.count({ where: { ...where, status: 'WAITING' } });
      const completedCount = await prisma.queueTicket.count({ where: { ...where, status: 'COMPLETED' } });

      results[cat] = {
        calledTickets,
        waitingTickets,
        completedTickets,
        stats: { total: totalToday, waiting: waitingCount, completed: completedCount },
      };
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('GET /api/queue/display error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
