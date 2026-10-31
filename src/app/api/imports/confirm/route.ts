import { NextRequest, NextResponse } from 'next/server';
import { ImportService } from '@/services/import.service';
import { SessionService } from '@/lib/auth/session';
import { z } from 'zod';

const confirmSchema = z.object({
  fileName: z.string().min(1),
  validRows: z.array(
    z.object({
      rowIndex: z.number(),
      sampleCode: z.string(),
      hgbValue: z.number(),
      hgbStatus: z.enum(['POSITIVE', 'NEGATIVE']),
      hctValue: z.number(),
      hctStatus: z.enum(['POSITIVE', 'NEGATIVE']),
      bothPositive: z.boolean(),
      bothPositiveDisplay: z.enum(['YES', 'NO']),
    })
  ),
  errors: z.array(
    z.object({
      rowIndex: z.number(),
      columnName: z.string().optional(),
      sampleCode: z.string().optional(),
      errorCode: z.string(),
      errorMessage: z.string(),
      originalValue: z.string().optional(),
    })
  ),
  thresholds: z.object({
    hgbThreshold: z.number(),
    hctThreshold: z.number(),
  }),
  reportTitle: z.string().optional(),
  recipientName: z.string().optional(),
  ageCategory: z.string().optional(),
  reportNumber: z.string().optional(),
  sampleReceiptDate: z.string().optional(),
  reportId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid input payload' },
        { status: 400 }
      );
    }

    const {
      fileName,
      validRows,
      errors,
      thresholds,
      reportTitle,
      recipientName,
      ageCategory,
      reportNumber,
      sampleReceiptDate,
      reportId,
    } = parsed.data;

    const result = await ImportService.confirmImport({
      fileName,
      validRows: validRows as any,
      errors,
      thresholds,
      adminUserId: session.userId,
      reportTitle,
      recipientName,
      ageCategory,
      reportNumber,
      reportId,
      sampleReceiptDate: sampleReceiptDate ? new Date(sampleReceiptDate) : undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Import confirmation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save import records' },
      { status: 500 }
    );
  }
}
