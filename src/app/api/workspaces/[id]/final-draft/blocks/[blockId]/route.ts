import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; blockId: string } }) {
  try {
    const { inDraft } = await req.json()
    const block = await prisma.finalDraftBlock.update({
      where: { id: params.blockId, workspaceId: params.id },
      data: { inDraft },
    })
    return NextResponse.json({ block })
  } catch (error) {
    console.error('[blocks PATCH]', error)
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; blockId: string } }) {
  try {
    await prisma.finalDraftBlock.delete({
      where: { id: params.blockId, workspaceId: params.id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[blocks DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
  }
}
