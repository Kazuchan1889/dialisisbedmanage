import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/queue/[id]  body: { status, counter? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, counter } = body;

    const validStatuses = ['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (counter !== undefined) updateData.counter = counter;

    // Set timestamps based on status
    if (status === 'CALLED') {
      updateData.calledAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const ticket = await prisma.queueTicket.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ticket });
  } catch (err: any) {
    console.error('PATCH /api/queue/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/queue/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await prisma.queueTicket.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/queue/[id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
