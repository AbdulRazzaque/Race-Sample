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

    const pdfBuffer = await ExportService.generateReportPdf(report as any, 'positive');
    const fileName = `RACE_SAMPLES_${report.reportNumber}_Positive_Samples.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Positive PDF export error:', error?.stack || error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate Positive PDF report: ' + (error?.message || 'Server error') },
      { status: 500 }
    );
  }
}
