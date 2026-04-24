import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function getOrCreateDraft(workspaceId: string) {
  // Find the latest final draft in this workspace
  let draft = await prisma.finalDraft.findFirst({
    where: { sceneSession: { workspaceId } },
    orderBy: { createdAt: 'desc' },
  })

  if (!draft) {
    // Create a dummy scene session for global draft
    const session = await prisma.sceneSession.create({
      data: {
        workspaceId,
        sceneType: 'global',
      },
    })
    draft = await prisma.finalDraft.create({
      data: {
        sceneSessionId: session.id,
        title: '',
        content: '',
      },
    })
  }
  return draft
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const draft = await getOrCreateDraft(params.id)
    return NextResponse.json({ draft })
  } catch (error) {
    console.error('[final-draft GET]', error)
    return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, content } = await req.json()
    const draft = await getOrCreateDraft(params.id)
    
    const updated = await prisma.finalDraft.update({
      where: { id: draft.id },
      data: {
        title: title !== undefined ? title : draft.title,
        content: content !== undefined ? content : draft.content,
      },
    })
    
    return NextResponse.json({ draft: updated })
  } catch (error) {
    console.error('[final-draft PUT]', error)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
}
