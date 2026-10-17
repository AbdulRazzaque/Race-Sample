import { NextRequest, NextResponse } from 'next/server';
import { SampleService } from '@/services/sample.service';
import { SessionService } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get('reportId') || undefined;
  const search = searchParams.get('search') || undefined;
  const hgbStatus = searchParams.get('hgbStatus') || undefined;
  const hctStatus = searchParams.get('hctStatus') || undefined;
  const bothPositive = searchParams.get('bothPositive') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  const sortBy = (searchParams.get('sortBy') as any) || 'rowNumber';
  const sortOrder = (searchParams.get('sortOrder') as any) || 'asc';

  try {
    const result = await SampleService.getSamples({
      reportId,
      search,
      hgbStatus,
      hctStatus,
      bothPositive,
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
    console.error('Fetch samples error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve samples' },
      { status: 500 }
    );
  }
}
