import { NextRequest, NextResponse } from 'next/server';
import { ReportService } from '@/services/report.service';
import { SessionService } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '15', 10);
  const sortBy = (searchParams.get('sortBy') as any) || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

  try {
    const result = await ReportService.getReports({
      search,
      status,
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve reports' },
      { status: 500 }
    );
  }
}
