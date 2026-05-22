import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bed = await prisma.bed.findUnique({
    where: { id: params.id },
    include: { machine: true },
  });

  if (!bed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(bed);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { status, patientName, patientId, notes } = body;

  const bed = await prisma.bed.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(patientName !== undefined && { patientName: status === 'AVAILABLE' ? null : patientName }),
      ...(patientId !== undefined && { patientId: status === 'AVAILABLE' ? null : patientId }),
      ...(notes !== undefined && { notes }),
    },
    include: { machine: true },
  });

  // Update machine status accordingly
  if (status && bed.machine) {
    const machineStatus =
      status === 'AVAILABLE' ? 'AVAILABLE' : status === 'OCCUPIED' ? 'IN_USE' : 'MAINTENANCE';
    const updatedMachine = await prisma.machine.update({
      where: { id: bed.machine.id },
      data: { status: machineStatus },
    });
    bed.machine = updatedMachine;
  }

  return NextResponse.json(bed);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.bed.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
