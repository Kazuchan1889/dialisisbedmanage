import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { floor } = body;

    if (!floor) {
      return NextResponse.json({ error: 'Lantai diperlukan' }, { status: 400 });
    }

    const updated = await prisma.bed.updateMany({
      where: { floor: Number(floor) },
      data: {
        status: 'AVAILABLE',
        patientName: null,
        patientId: null,
        notes: null,
      },
    });

    return NextResponse.json(
      { message: `Berhasil mengosongkan ${updated.count} bed di lantai ${floor}.`, count: updated.count },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
