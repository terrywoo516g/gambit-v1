import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const blocks = await prisma.finalDraftBlock.findMany({
      where: { workspaceId: params.id },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ blocks })
  } catch (error) {
    console.error('[blocks GET]', error)
    return NextResponse.json({ error: 'Failed to load blocks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { sourceType, sourceId, sourceLabel, content } = await req.json()
    
    // Check if already exists
    const existing = await prisma.finalDraftBlock.findFirst({
      where: { workspaceId: params.id, sourceId },
    })
    if (existing) {
      return NextResponse.json({ error: '已存在' }, { status: 400 })
    }

    const lastBlock = await prisma.finalDraftBlock.findFirst({
      where: { workspaceId: params.id },
      orderBy: { order: 'desc' },
    })
    const order = lastBlock ? lastBlock.order + 1 : 0

    const block = await prisma.finalDraftBlock.create({
      data: {
        id: uuidv4(),
        workspaceId: params.id,
        sourceType,
        sourceId,
        sourceLabel,
        content,
        order,
      },
    })
    return NextResponse.json({ block })
  } catch (error) {
    console.error('[blocks POST]', error)
    return NextResponse.json({ error: 'Failed to add block' }, { status: 500 })
  }
}
