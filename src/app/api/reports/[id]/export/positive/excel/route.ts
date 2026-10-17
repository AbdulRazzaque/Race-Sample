import { NextRequest, NextResponse } from 'next/server';
import { ReportService } from '@/services/report.service';
import { ExportService } from '@/services/export.service';
import { SessionService } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await ReportService.getReportById(params.id);
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    const excelBuffer = await ExportService.generatePositiveReportExcel(report as any);
    const fileName = `RACE_SAMPLES_${report.reportNumber}_Positive_Samples.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Positive Excel export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate Positive Excel report' },
      { status: 500 }
    );
  }
}
