import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
      { name: { contains: search, mode: 'insensitive' } },
      { nik: { contains: search, mode: 'insensitive' } },
      { mrNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [patients, totalCount] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);

    return NextResponse.json({
      patients,
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
    const { name, initialAssessment, dateOfBirth, nik, jknNumber, mrNumber, dead, travelling, moved } = body;

    if (!name || !dateOfBirth || !mrNumber) {
      return NextResponse.json({ error: 'Nama, Tanggal Lahir, dan No. MR wajib diisi' }, { status: 400 });
    }

    // Check mrNumber uniqueness
    const existing = await prisma.patient.findUnique({ where: { mrNumber } });
    if (existing) {
      return NextResponse.json({ error: 'Nomor Rekam Medis (MR) sudah terdaftar' }, { status: 400 });
    }

    // Check mutual exclusivity of dead, travelling, moved (at most one is true)
    let activeFlags = 0;
    if (dead) activeFlags++;
    if (travelling) activeFlags++;
    if (moved) activeFlags++;

    if (activeFlags > 1) {
      return NextResponse.json({ error: 'Pasien hanya boleh memiliki salah satu status: Dead, Travelling, atau Moved.' }, { status: 400 });
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        initialAssessment,
        dateOfBirth: new Date(dateOfBirth),
        nik,
        jknNumber,
        mrNumber,
        dead: !!dead,
        travelling: !!travelling,
        moved: !!moved,
      }
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
