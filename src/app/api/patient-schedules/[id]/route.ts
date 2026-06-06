import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncBedState } from '@/lib/bedSync';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const schedule = await prisma.patientSchedule.findUnique({
      where: { id: params.id }
    });
    if (!schedule) {
      return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });
    }

    await prisma.patientSchedule.delete({ where: { id: params.id } });

    // Sync the bed's status and occupant, clearing the patient if they are currently assigned
    await syncBedState(schedule.bedId, { deletedPatientName: schedule.patientName });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const oldSchedule = await prisma.patientSchedule.findUnique({
      where: { id: params.id }
    });
    if (!oldSchedule) {
      return NextResponse.json({ error: 'Jadwal tidak ditemukan' }, { status: 404 });
    }

    const body = await req.json();
    const { patientId, patientName, sessionType, startTime, endTime, notes, bedId } = body;

    const updated = await prisma.patientSchedule.update({
      where: { id: params.id },
      data: {
        ...(bedId        && { bedId }),
        ...(patientId    && { patientId }),
        ...(patientName  && { patientName }),
        ...(sessionType  && { sessionType }),
        ...(startTime    && { startTime: new Date(startTime) }),
        ...(endTime      && { endTime:   new Date(endTime) }),
        notes: notes ?? undefined,
      },
    });

    // Sync original bed with old patient name to clear it if it's no longer active
    await syncBedState(oldSchedule.bedId, { deletedPatientName: oldSchedule.patientName });

    // If bed was changed, sync the new bed as well
    if (updated.bedId !== oldSchedule.bedId) {
      await syncBedState(updated.bedId);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
