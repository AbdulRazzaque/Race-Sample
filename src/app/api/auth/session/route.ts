import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, lastLoginAt: true },
  });

  if (!admin) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: admin,
  });
}
