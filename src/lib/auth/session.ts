import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_KEYS } from '@/constants';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'race_samples_default_session_secret_change_in_production_32chars'
);

export interface SessionPayload {
  userId: string;
  username: string;
  expiresAt: number;
}

export class SessionService {
  private static readonly SESSION_DURATION_HOURS = 24;

  public static async createToken(userId: string, username: string): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + this.SESSION_DURATION_HOURS * 3600;

    return new SignJWT({ userId, username, expiresAt })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.SESSION_DURATION_HOURS}h`)
      .sign(SECRET_KEY);
  }

  public static async verifyToken(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY, {
        algorithms: ['HS256'],
      });
      return payload as unknown as SessionPayload;
    } catch {
      return null;
    }
  }

  public static async getCurrentSession(): Promise<SessionPayload | null> {
    const cookieStore = cookies();
    const token = cookieStore.get(STORAGE_KEYS.SESSION_COOKIE)?.value;
    if (!token) return null;
    return this.verifyToken(token);
  }

  public static async setSessionCookie(response: NextResponse, token: string): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set({
      name: STORAGE_KEYS.SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: this.SESSION_DURATION_HOURS * 3600,
    });
  }

  public static async clearSessionCookie(response: NextResponse): Promise<void> {
    response.cookies.set({
      name: STORAGE_KEYS.SESSION_COOKIE,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  public static async validateRequestSession(request: NextRequest): Promise<SessionPayload | null> {
    const token = request.cookies.get(STORAGE_KEYS.SESSION_COOKIE)?.value;
    if (!token) return null;
    return this.verifyToken(token);
  }
}
