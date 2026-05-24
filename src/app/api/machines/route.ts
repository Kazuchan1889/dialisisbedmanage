import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MachineStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';

  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { machineCode: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
    // If the search query is a number, we can search by floor
    const searchInt = parseInt(search, 10);
    if (!isNaN(searchInt)) {
      where.OR.push({ floor: searchInt });
    }
  }

  try {
    const [machines, totalCount] = await Promise.all([
      prisma.machine.findMany({
        where,
        include: {
          bed: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.machine.count({ where }),
    ]);

    return NextResponse.json({
      machines,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { machineCode, floor, status, notes, bedId } = body;

    if (!machineCode || floor === undefined || !status) {
      return NextResponse.json({ error: 'Kode Mesin, Lantai, dan Status wajib diisi' }, { status: 400 });
    }

    // Check machineCode uniqueness
    const existing = await prisma.machine.findUnique({ where: { machineCode } });
    if (existing) {
      return NextResponse.json({ error: 'Kode mesin sudah terdaftar' }, { status: 400 });
    }

    // Validate status value against enum
    if (!Object.values(MachineStatus).includes(status as MachineStatus)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    // Check if bed is already linked to another machine
    if (bedId) {
      const existingBedLink = await prisma.machine.findUnique({ where: { bedId } });
      if (existingBedLink) {
        return NextResponse.json({ error: 'Tempat tidur ini sudah terhubung dengan mesin lain' }, { status: 400 });
      }
    }

    const machine = await prisma.machine.create({
      data: {
        machineCode,
        floor: parseInt(floor, 10),
        status: status as MachineStatus,
        notes: notes || null,
        bedId: bedId || null,
      },
      include: {
        bed: true,
      },
    });

    return NextResponse.json(machine, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
