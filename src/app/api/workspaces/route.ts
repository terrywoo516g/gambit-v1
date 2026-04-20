import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      mode: true,
      toolsUsed: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json({ workspaces });
}

