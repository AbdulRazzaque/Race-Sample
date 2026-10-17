import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { SessionService } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const skip = (page - 1) * pageSize;

  const [totalCount, jobs] = await Promise.all([
    prisma.importJob.count(),
    prisma.importJob.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { errors: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: jobs,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
}
