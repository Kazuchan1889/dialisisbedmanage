import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/queue/display
// Returns called + waiting for ALL categories (Poli, Dialisis, Obat)
// Optimized: single query + in-memory grouping to minimize DB connections
export async function GET(req: NextRequest) {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const dayStart = new Date(todayStr + 'T00:00:00+07:00');
    const dayEnd = new Date(todayStr + 'T23:59:59.999+07:00');

    // Single query to get ALL tickets for today across all categories
    const allTickets = await prisma.queueTicket.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { queueNumber: 'asc' },
    });

    const categories = ['POLI', 'DIALISIS', 'OBAT'] as const;
    const results: Record<string, any> = {};

    for (const cat of categories) {
      const catTickets = allTickets.filter(t => t.category === cat);

      const calledTickets = catTickets
        .filter(t => t.status === 'CALLED' || t.status === 'SERVING')
        .sort((a, b) => {
          const aTime = a.calledAt ? new Date(a.calledAt).getTime() : 0;
          const bTime = b.calledAt ? new Date(b.calledAt).getTime() : 0;
          return bTime - aTime; // desc
        })
        .slice(0, 3);

      const waitingTickets = catTickets
        .filter(t => t.status === 'WAITING')
        .slice(0, 10);

      const completedTickets = catTickets
        .filter(t => t.status === 'COMPLETED')
        .sort((a, b) => {
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bTime - aTime; // desc
        })
        .slice(0, 5);

      results[cat] = {
        calledTickets,
        waitingTickets,
        completedTickets,
        stats: {
          total: catTickets.length,
          waiting: catTickets.filter(t => t.status === 'WAITING').length,
          completed: catTickets.filter(t => t.status === 'COMPLETED').length,
        },
      };
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error('GET /api/queue/display error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

