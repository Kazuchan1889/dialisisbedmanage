import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { username, name, role, active, password } = body;

  const updateData: any = {};
  if (username !== undefined) {
    if (!username.trim()) {
      return NextResponse.json({ error: 'Username cannot be empty' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    updateData.username = username;
  }
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (active !== undefined) updateData.active = active;
  if (password) updateData.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent deleting own account
  if ((session.user as any).id === params.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
