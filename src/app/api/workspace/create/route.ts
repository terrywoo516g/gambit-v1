import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, mode } = body as { title?: string; mode?: string };

    let deviceId = req.cookies.get('deviceId')?.value;

    if (!deviceId) {
      deviceId = uuidv4();
    }

    const workspace = await prisma.workspace.create({
      data: {
        id: uuidv4(),
        deviceId,
        title: title || '新工作台',
        mode: mode || 'chat',
        toolsUsed: '[]',
        currentState: '{}',
      },
    });

    const response = NextResponse.json({
      workspace: {
        id: workspace.id,
        title: workspace.title,
        mode: workspace.mode,
        createdAt: workspace.createdAt,
      },
    });

    if (!req.cookies.get('deviceId')) {
      response.cookies.set('deviceId', deviceId, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    }

    return response;
  } catch (err) {
    console.error('[/api/workspace/create]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
