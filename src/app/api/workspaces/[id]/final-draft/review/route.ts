import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { PRICING } from '@/lib/billing/pricing'
import { chargeCredits } from '@/lib/billing/withCreditsCharge'
import { assertWorkspaceOwnership, OwnershipError } from '@/lib/auth/ownership'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    const { text, workspaceId } = body || {}
    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }
    if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }

    try {
      await assertWorkspaceOwnership(workspaceId, userId)
    } catch (e) {
      if (e instanceof OwnershipError) return NextResponse.json({ error: 'not found' }, { status: 404 })
      throw e
    }

    const chargeRes = await chargeCredits(
      userId,
      PRICING.FINAL_DRAFT_REVIEW,
      'consume_final_draft_review',
      `final-draft review (workspace ${workspaceId})`
    )
    if (chargeRes) return chargeRes

    const models = [
      { id: 'deepseek/deepseek-v3.2-251201', name: 'DeepSeek V3.2' },     
      { id: 'MiniMax-M1', name: 'MiniMax M1' },
      { id: 'qwen3-max', name: 'Qwen3 Max' }
    ]

    const reviewPrompt = `You are a professional review expert. Please review the following text, identify issues, and return in JSON format.
Please output strictly JSON without any Markdown backticks, with the following structure:
{
  "suggestions": [
    { "type": "type(logic/grammar/style etc)", "severity": "severity(high/medium/low)", "quote": "problematic text snippet", "content": "specific modification suggestions" }
  ]
}

Text to review:
${text}`

    const results = await Promise.allSettled(
      models.map(m => chatOnce({
        provider: 'qiniu',
        model: m.id,
        messages: [{ role: 'user', content: reviewPrompt }]
      }))
    )

    const allSuggestions: any[] = []

    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        try {
          const raw = res.value.replace(/```json/g, '').replace(/```/g, '').trim()
          const parsed = JSON.parse(raw)
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {  
            parsed.suggestions.forEach((s: any) => {
              allSuggestions.push({
                ...s,
                source: models[i].name
              })
            })
          }
        } catch {
          console.error('Failed to parse JSON from model:', models[i].name)
        }
      }
    })

    if (allSuggestions.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const mergePrompt = `Below are review suggestions from multiple AI experts. Please deduplicate, merge, and summarize them to output a final high-quality list of suggestions.
Please output strictly JSON without any Markdown backticks, with the following structure:
{
  "suggestions": [
    { "id": "unique ID(e.g.s1)", "type": "issue type", "severity": "severity level", "quote": "original text snippet", "content": "comprehensive modification suggestions", "sources": ["list of AI names that suggested this"] }
  ]
}

Expert suggestions input:
${JSON.stringify(allSuggestions, null, 2)}`

    const mergedRaw = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: mergePrompt }]
    })

    let finalSuggestions = []
    try {
      const raw = mergedRaw.replace(/```json/g, '').replace(/```/g, '').trim()
      finalSuggestions = JSON.parse(raw).suggestions || []
    } catch {
      console.error('Failed to parse merged JSON')
    }

    return NextResponse.json({ suggestions: finalSuggestions })

  } catch (error) {
    console.error('[final-draft/review]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}