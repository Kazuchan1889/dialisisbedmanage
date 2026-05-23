import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.nurseSchedule.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { nurseId, startTime, endTime, notes } = body;

    const data: any = {};
    if (nurseId) data.nurseId = nurseId;
    if (startTime) data.startTime = new Date(startTime);
    if (endTime) data.endTime = new Date(endTime);
    if (notes !== undefined) data.notes = notes;

    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    const updated = await prisma.nurseSchedule.update({
      where: { id: params.id },
      data,
      include: {
        nurse: {
          select: { id: true, name: true },
        },
        bed: {
          select: { id: true, bedCode: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
