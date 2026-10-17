import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { SessionService } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const errors = await prisma.importError.findMany({
    where: { importJobId: id },
    orderBy: { rowNumber: 'asc' },
  });

  return NextResponse.json({
    success: true,
    data: errors,
  });
}
