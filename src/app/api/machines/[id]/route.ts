import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MachineStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { machineCode, floor, status, notes, bedId } = body;

    // Check if machine exists
    const currentMachine = await prisma.machine.findUnique({ where: { id: params.id } });
    if (!currentMachine) {
      return NextResponse.json({ error: 'Mesin tidak ditemukan' }, { status: 404 });
    }

    // Check machineCode uniqueness if changed
    if (machineCode && machineCode !== currentMachine.machineCode) {
      const existing = await prisma.machine.findUnique({ where: { machineCode } });
      if (existing) {
        return NextResponse.json({ error: 'Kode mesin sudah terdaftar' }, { status: 400 });
      }
    }

    // Validate status value against enum if changed
    if (status && !Object.values(MachineStatus).includes(status as MachineStatus)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    // Check if bed is already linked to another machine if changing
    if (bedId !== undefined && bedId !== null && bedId !== currentMachine.bedId) {
      const existingBedLink = await prisma.machine.findUnique({
        where: { bedId },
      });
      if (existingBedLink && existingBedLink.id !== params.id) {
        return NextResponse.json({ error: 'Tempat tidur ini sudah terhubung dengan mesin lain' }, { status: 400 });
      }
    }

    const updated = await prisma.machine.update({
      where: { id: params.id },
      data: {
        ...(machineCode !== undefined && { machineCode }),
        ...(floor !== undefined && { floor: parseInt(floor, 10) }),
        ...(status !== undefined && { status: status as MachineStatus }),
        ...(notes !== undefined && { notes: notes || null }),
        bedId: bedId === undefined ? currentMachine.bedId : (bedId || null),
      },
      include: {
        bed: true,
      },
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
    await prisma.machine.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
