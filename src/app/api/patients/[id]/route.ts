import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { title, name, initialAssessment, dateOfBirth, nik, jknNumber, mrNumber, dead, travelling, moved } = body;

    // Check mutual exclusivity of dead, travelling, moved (at most one is true)
    let activeFlags = 0;
    if (dead) activeFlags++;
    if (travelling) activeFlags++;
    if (moved) activeFlags++;

    if (activeFlags > 1) {
      return NextResponse.json({ error: 'Pasien hanya boleh memiliki salah satu status: Dead, Travelling, atau Moved.' }, { status: 400 });
    }

    if (mrNumber) {
      const existing = await prisma.patient.findFirst({
        where: {
          mrNumber,
          id: { not: params.id }
        }
      });
      if (existing) {
        return NextResponse.json({ error: 'Nomor Rekam Medis (MR) sudah digunakan oleh pasien lain' }, { status: 400 });
      }
    }

    const updated = await prisma.patient.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title || null }),
        ...(name !== undefined && { name }),
        ...(initialAssessment !== undefined && { initialAssessment }),
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
        ...(nik !== undefined && { nik }),
        ...(jknNumber !== undefined && { jknNumber }),
        ...(mrNumber !== undefined && { mrNumber }),
        ...(dead !== undefined && { dead: !!dead }),
        ...(travelling !== undefined && { travelling: !!travelling }),
        ...(moved !== undefined && { moved: !!moved }),
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await prisma.patient.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
