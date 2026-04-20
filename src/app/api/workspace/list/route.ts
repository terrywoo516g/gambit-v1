import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.cookies.get('deviceId')?.value;

    if (!deviceId) {
      return NextResponse.json({ workspaces: [] });
    }

    const workspaces = await prisma.workspace.findMany({
      where: { deviceId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ workspaces });
  } catch (err) {
    console.error('[/api/workspace/list]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}