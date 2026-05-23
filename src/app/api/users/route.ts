import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('activeOnly') === 'true';

  const isAdmin = (session.user as any).role === 'ADMIN';
  
  // Staff are forced to only see active users. Admins can see all unless activeOnly is specified.
  const where = (!isAdmin || activeOnly) ? { active: true } : undefined;

  const users = await prisma.user.findMany({
    where,
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { username, password, name, role } = body;

  if (!username || !password || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, password: hashedPassword, name, role: role || 'STAFF' },
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
