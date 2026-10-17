import { NextRequest, NextResponse } from 'next/server';
import { ReportService } from '@/services/report.service';
import { SessionService } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await ReportService.getDashboardMetrics();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load dashboard metrics' },
      { status: 500 }
    );
  }
}
