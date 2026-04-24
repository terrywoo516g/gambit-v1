import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

    const models = [
      { id: 'deepseek/deepseek-v3.2-251201', name: 'DeepSeek V3.2' },
      { id: 'MiniMax-M1', name: 'MiniMax M1' },
      { id: 'qwen3-max', name: 'Qwen3 Max' }
    ]

    const reviewPrompt = `你是一个专业的审阅专家。请审阅以下文本，指出问题，并以JSON格式返回。
请严格输出JSON，不要有任何 Markdown \`\`\` 标记，结构如下：
{
  "suggestions": [
    { "type": "类型(逻辑/文法/风格等)", "severity": "严重度(高/中/低)", "quote": "有问题的原文片段", "content": "具体的修改建议" }
  ]
}

待审阅文本：
${text}`

    // Call 3 models concurrently
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

    // Merge using DeepSeek
    const mergePrompt = `下面是多位AI专家的审阅建议，请你进行去重、合并和归纳，输出最终的高质量建议列表。
请严格输出JSON，不要有任何 Markdown \`\`\` 标记，结构如下：
{
  "suggestions": [
    { "id": "唯一ID(如s1)", "type": "问题类型", "severity": "严重程度", "quote": "原文片段", "content": "综合修改建议", "sources": ["提出该建议的AI名称列表"] }
  ]
}

专家建议输入：
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
