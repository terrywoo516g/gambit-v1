import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: {
        modelRuns: { orderBy: { createdAt: 'asc' } },
        artifacts: { orderBy: { createdAt: 'desc' } },
        sceneSessions: {
          orderBy: { createdAt: 'desc' },
          include: { finalDrafts: { orderBy: { version: 'desc' } } },
        },
      },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    return NextResponse.json({
      workspace: {
        ...workspace,
        selectedModels: JSON.parse(workspace.selectedModels),
      },
    })
  } catch (err) {
    console.error('[GET /api/workspaces/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.workspace.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/workspaces/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
