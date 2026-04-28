import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id

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

    if (!workspace || workspace.userId !== userId) {
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id

    const workspace = await prisma.workspace.findUnique({ where: { id: params.id } })
    if (!workspace || workspace.userId !== userId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    await prisma.workspace.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/workspaces/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
