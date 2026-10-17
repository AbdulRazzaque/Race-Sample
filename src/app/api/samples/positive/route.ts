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
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

  try {
    const result = await SampleService.getPositiveSamples({
      reportId,
      search,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Fetch positive samples error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve positive samples' },
      { status: 500 }
    );
  }
}
