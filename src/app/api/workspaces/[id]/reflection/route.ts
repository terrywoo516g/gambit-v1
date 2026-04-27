import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { prisma } from '@/lib/db'
import { buildReflectionPrompt } from '@/lib/reflection/prompt'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wsId = params.id
    if (!wsId) {
      return NextResponse.json({ error: 'INVALID_WORKSPACE_ID' }, { status: 400 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: wsId },
      include: { modelRuns: true }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'WORKSPACE_NOT_FOUND' }, { status: 404 })
    }

    const validAnswers = workspace.modelRuns
      .filter((r: any) => r.content && r.content.trim().length > 0)
      .map((r: any) => {
        const content = r.content.length > 400 ? r.content.substring(0, 400) + '...' : r.content
        return { model: r.model, content }
      })

    console.log('[reflection] workspace:', wsId, 'totalRuns:', workspace.modelRuns.length, 'validAnswers:', validAnswers.length)

    if (validAnswers.length === 0) {
      return NextResponse.json({ error: 'INSUFFICIENT_RESPONSES' }, { status: 422 })
    }

    const prompt = buildReflectionPrompt(workspace.prompt || '未知问题', validAnswers)

    const rawContent = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    let reflection = null
    try {
      const match = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || rawContent.match(/\{[\s\S]*\}/)
      const raw = match ? match[1] || match[0] : rawContent
      reflection = JSON.parse(raw)

      if (!reflection || typeof reflection.draft !== 'string' || reflection.draft.trim().length === 0) {
        console.error('Reflection parse error: missing or empty draft field')
        return NextResponse.json({ error: 'PARSE_ERROR' }, { status: 500 })
      }
    } catch {
      console.error('Reflection parse error. Raw:', rawContent)
      return NextResponse.json({ error: 'PARSE_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ reflection })

  } catch (error) {
    console.error('Reflection API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
