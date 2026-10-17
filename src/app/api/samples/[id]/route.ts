import { NextRequest, NextResponse } from 'next/server';
import { SampleService } from '@/services/sample.service';
import { SessionService } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { z } from 'zod';

const updateSampleSchema = z.object({
  sampleCode: z.string().min(1).optional(),
  hgbValue: z.number().min(0).optional(),
  hctValue: z.number().min(0).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sample = await prisma.sample.findUnique({
    where: { id: params.id },
    include: { report: true },
  });

  if (!sample) {
    return NextResponse.json({ success: false, error: 'Sample not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...sample,
      hgbValue: Number(sample.hgbValue),
      hctValue: Number(sample.hctValue),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateSampleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const updated = await SampleService.updateSample(
      params.id,
      parsed.data,
      session.userId
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update sample error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update sample' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await SampleService.deleteSample(params.id, session.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Delete sample error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete sample' },
      { status: 500 }
    );
  }
}
