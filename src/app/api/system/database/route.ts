import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/auth/session';
import { SQLiteManager } from '@/lib/db/sqlite-manager';
import prisma from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const info = await SQLiteManager.getDatabaseInfo(prisma);
    const backups = SQLiteManager.listBackups();
    return NextResponse.json({
      success: true,
      data: {
        ...info,
        backups,
      },
    });
  } catch (err: any) {
    console.error('System DB info error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await SessionService.validateRequestSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.action === 'backup') {
      const result = SQLiteManager.createManualBackup();
      return NextResponse.json(result);
    }

    if (body.action === 'restore' && body.fileName) {
      const result = SQLiteManager.restoreBackup(body.fileName);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Database backup operation error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
