import { NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  await SessionService.clearSessionCookie(response);
  return response;
}
