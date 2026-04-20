import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteParams = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        artifacts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (err) {
    console.error('[/api/workspace/:id GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const body = await req.json();
    const { title, currentState } = body as { title?: string; currentState?: object };

    const updateData: { title?: string; currentState?: string } = {};
    if (title !== undefined) updateData.title = title;
    if (currentState !== undefined) updateData.currentState = JSON.stringify(currentState);

    const workspace = await prisma.workspace.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ workspace });
  } catch (err) {
    console.error('[/api/workspace/:id PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await prisma.message.deleteMany({ where: { workspaceId: params.id } });
    await prisma.artifact.deleteMany({ where: { workspaceId: params.id } });
    await prisma.source.deleteMany({ where: { workspaceId: params.id } });
    await prisma.workspace.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/workspace/:id DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}