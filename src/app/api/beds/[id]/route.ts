import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bed = await prisma.bed.findUnique({
    where: { id: params.id },
    include: { 
      machine: true,
      nurseSchedules: {
        include: {
          nurse: {
            select: { id: true, name: true }
          }
        },
        orderBy: { startTime: 'desc' },
        take: 5
      }
    },
  });

  if (!bed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(bed);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { status, patientName, patientId, notes, nurseSchedule, unassignActiveSchedule } = body;

  // Update bed information
  const bed = await prisma.bed.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined && { status }),
      patientName: status === 'AVAILABLE' ? null : (patientName !== undefined ? patientName : undefined),
      patientId: status === 'AVAILABLE' ? null : (patientId !== undefined ? patientId : undefined),
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

  // End active schedules if unassign is requested
  if (unassignActiveSchedule) {
    const now = new Date();
    await prisma.nurseSchedule.updateMany({
      where: {
        bedId: params.id,
        startTime: { lte: now },
        endTime: { gte: now }
      },
      data: {
        endTime: now
      }
    });
  }

  // Create nurse schedule if provided
  if (nurseSchedule) {
    const { nurseId, startTime, endTime, notes: scheduleNotes } = nurseSchedule;
    if (nurseId && startTime && endTime) {
      await prisma.nurseSchedule.create({
        data: {
          bedId: params.id,
          nurseId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          notes: scheduleNotes,
        }
      });
    }
  }

  // Fetch updated bed with all relations
  const updatedBed = await prisma.bed.findUnique({
    where: { id: params.id },
    include: {
      machine: true,
      nurseSchedules: {
        include: {
          nurse: {
            select: { id: true, name: true }
          }
        },
        orderBy: { startTime: 'desc' },
        take: 5
      }
    }
  });

  return NextResponse.json(updatedBed);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.bed.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
