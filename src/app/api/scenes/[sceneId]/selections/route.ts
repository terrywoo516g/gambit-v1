import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const body = await req.json()
    const { starred, excluded, editedRows } = body

    const session = await prisma.sceneSession.findUnique({
      where: { id: params.sceneId },
    })

    if (!session) {
      return NextResponse.json({ error: 'Scene session not found' }, { status: 404 })
    }

    const currentSelections = JSON.parse(session.userSelections)
    const updated = {
      ...currentSelections,
      ...(starred !== undefined && { starred }),
      ...(excluded !== undefined && { excluded }),
      ...(editedRows !== undefined && { editedRows }),
    }

    await prisma.sceneSession.update({
      where: { id: params.sceneId },
      data: { userSelections: JSON.stringify(updated) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[selections PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
