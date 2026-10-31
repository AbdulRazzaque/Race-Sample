import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      app: 'race-samples',
      appName: 'RACE SAMPLES Laboratory System',
      version: '1.0.0',
      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-App-Identity': 'race-samples-desktop',
      },
    }
  );
}
