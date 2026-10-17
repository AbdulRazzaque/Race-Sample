import { NextRequest, NextResponse } from 'next/server';
import { ReportService } from '@/services/report.service';
import { SessionService } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updated = await ReportService.toggleArchiveReport(params.id, session.userId);
    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Archive report error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to archive report' },
      { status: 500 }
    );
  }
}
