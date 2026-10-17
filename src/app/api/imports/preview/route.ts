import { NextRequest, NextResponse } from 'next/server';
import { ImportService } from '@/services/import.service';
import { SessionService } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file was uploaded' },
        { status: 400 }
      );
    }

    // Check file extension
    const fileName = file.name;
    const isExcel = /\.(xlsx|xls)$/i.test(fileName);
    if (!isExcel) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format. Please upload an Excel (.xlsx or .xls) file.' },
        { status: 400 }
      );
    }

    // Check file size (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum allowed limit (15MB).' },
        { status: 400 }
      );
    }

    const sheetName = formData.get('sheetName') as string | null;
    const mappingJson = formData.get('mapping') as string | null;
    let mapping = undefined;
    if (mappingJson) {
      try {
        mapping = JSON.parse(mappingJson);
      } catch {
        // ignore
      }
    }

    const hgbCustom = formData.get('hgbThreshold') as string | null;
    const hctCustom = formData.get('hctThreshold') as string | null;
    const customThresholds =
      hgbCustom && hctCustom
        ? { hgbThreshold: parseFloat(hgbCustom), hctThreshold: parseFloat(hctCustom) }
        : undefined;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await ImportService.parseAndPreview(
      buffer,
      fileName,
      sheetName || undefined,
      mapping,
      customThresholds
    );

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    console.error('Import preview error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse Excel file' },
      { status: 400 }
    );
  }
}
