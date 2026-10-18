import { NextRequest, NextResponse } from 'next/server';
import { SampleService } from '@/services/sample.service';
import { ExportService } from '@/services/export.service';
import { SessionService } from '@/lib/auth/session';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sampleIds, filters } = body;

    let samples;
    if (sampleIds && Array.isArray(sampleIds) && sampleIds.length > 0) {
      // Selected samples
      const all = await SampleService.getAllMatchingSamples({});
      samples = all.filter((s) => sampleIds.includes(s.id));
    } else {
      // Filtered samples
      samples = await SampleService.getAllMatchingSamples(filters || {});
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RACE SAMPLES';
    const sheet = workbook.addWorksheet('Exported Samples');

    sheet.addRow([
      'SN',
      'REPORT NO',
      'SAMPLE CODE',
      'HGB (g/dL)',
      'HGB STATUS',
      'HCT (%)',
      'HCT STATUS',
      'BOTH POSITIVE',
    ]);

    const header = sheet.getRow(1);
    header.height = 26;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF173B65' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    samples.forEach((s, idx) => {
      const row = sheet.addRow([
        idx + 1,
        s.reportNumber,
        s.sampleCode,
        s.hgbValue,
        s.hgbStatus,
        s.hctValue,
        s.hctStatus,
        s.bothPositive ? 'YES' : 'NO',
      ]);

      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          bottom: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          left: { style: 'thin', color: { argb: 'FFD9E0E8' } },
          right: { style: 'thin', color: { argb: 'FFD9E0E8' } },
        };
      });

      if (s.hgbStatus === 'POSITIVE') row.getCell(5).font = { bold: true, color: { argb: 'FFE53935' } };
      if (s.hctStatus === 'POSITIVE') row.getCell(7).font = { bold: true, color: { argb: 'FFE53935' } };
      if (s.bothPositive) row.getCell(8).font = { bold: true, color: { argb: 'FFE53935' } };
    });

    sheet.columns = [
      { width: 8 },
      { width: 14 },
      { width: 18 },
      { width: 14 },
      { width: 16 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `RACE_SAMPLES_Filtered_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer as any), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Export selected/filtered samples error:', error?.stack || error);
    return NextResponse.json(
      { success: false, error: 'Failed to export samples: ' + (error?.message || 'Server error') },
      { status: 500 }
    );
  }
}
