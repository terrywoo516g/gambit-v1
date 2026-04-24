import { NextRequest, NextResponse } from 'next/server'
import { chatOnce, ADVANCED_MODEL } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { context, type } = await req.json()
    if (!context) return NextResponse.json({ error: 'Context required' }, { status: 400 })

    let systemPrompt = '你是高级洞察助手，提供差异化、反常识观点。请严格返回 JSON 格式数据。'
    if (type === 'angle') {
      systemPrompt += ' 请根据用户提供的文本，发掘3-5个原文没有覆盖到的全新角度。'
    } else if (type === 'rewrite') {
      systemPrompt += ' 请根据用户提供的文本，提供3-5种完全不同风格或体裁的重写灵感或开头示范。'
    } else if (type === 'counter') {
      systemPrompt += ' 请根据用户提供的文本，提出3-5个犀利的反方观点或挑战，指出原文可能存在的盲点或局限。'
    }

    const prompt = `要求输出格式如下，不要包含任何 Markdown \`\`\` 标记：
{ "sparks": [ { "angle": "角度/标签名", "content": "具体灵感内容（200字以内）" } ] }

待分析文本：
${context}`

    const res = await chatOnce({
      provider: 'qiniu',
      model: ADVANCED_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })

    let sparks = []
    try {
      const raw = res.replace(/```json/g, '').replace(/```/g, '').trim()
      sparks = JSON.parse(raw).sparks.map((s: any) => ({
        id: uuidv4(),
        angle: s.angle,
        content: s.content
      }))
    } catch {
      console.error('Failed to parse spark JSON')
    }

    return NextResponse.json({ sparks })

  } catch (error) {
    console.error('[final-draft/spark]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
