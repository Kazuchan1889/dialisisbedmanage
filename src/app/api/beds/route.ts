import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const floor = searchParams.get('floor');
  const now = new Date();

  const beds = await prisma.bed.findMany({
    where: floor ? { floor: parseInt(floor) } : undefined,
    include: { 
      machine: true,
      nurseSchedules: {
        where: {
          startTime: { lte: now },
          endTime: { gte: now },
        },
        include: {
          nurse: {
            select: { id: true, name: true, role: true }
          }
        },
        take: 1
      }
    },
    orderBy: [{ floor: 'asc' }, { section: 'asc' }, { position: 'asc' }],
  });

  return NextResponse.json(beds);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const bed = await prisma.bed.create({ data: body });
  return NextResponse.json(bed, { status: 201 });
}
