import { NextRequest, NextResponse } from 'next/server';
import { SettingsService } from '@/services/settings.service';
import { SessionService } from '@/lib/auth/session';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  appName: z.string().optional(),
  orgName: z.string().optional(),
  orgNameAr: z.string().optional(),
  eventName: z.string().optional(),
  recipientName: z.string().optional(),
  ageCategory: z.string().optional(),
  hgbThreshold: z.number().min(1).max(50).optional(),
  hctThreshold: z.number().min(1).max(100).optional(),
  reportHeaderNotes: z.string().optional(),
  footerText: z.string().optional(),
  logoDataUrl: z.string().optional(),
  committeeLogoDataUrl: z.string().optional(),
  stampDataUrl: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await SettingsService.getAllSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const updated = await SettingsService.updateSettings(parsed.data, session.userId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
