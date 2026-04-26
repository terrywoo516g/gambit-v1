import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import OpenAI from 'openai'
import { buildReflectionPrompt } from '@/lib/reflection/prompt'

function createPrisma() {
  if (process.env.DATABASE_URL?.startsWith('file:')) {
    const libsql = createClient({
      url: process.env.DATABASE_URL,
    })
    const adapter = new PrismaLibSql(libsql as any)
    return new PrismaClient({ adapter })
  }
  return new PrismaClient()
}

const getPrisma = () => {
  if (!(global as any).prisma) {
    (global as any).prisma = createPrisma()
  }
  return (global as any).prisma
}

const getOpenAI = () => new OpenAI({
  baseURL: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY || 'dummy_key_for_build',
})

function cleanLLMJsonOutput(raw: string): string {
  let s = raw.trim()
  // 去除 markdown 代码块标记
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '')
  // 截取第一个 { 到最后一个 }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) s = s.slice(start, end + 1)
  return s.trim()
}

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const wsId = params.id
    if (!wsId) {
      return NextResponse.json({ error: 'INVALID_WORKSPACE_ID' }, { status: 400 })
    }

    const workspace = await getPrisma().workspace.findUnique({
      where: { id: wsId },
      include: {
        modelRuns: true
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'WORKSPACE_NOT_FOUND' }, { status: 404 })
    }

    // 过滤出有效回答：content 存在且长度 > 0
    // 在数据库中，完成态的 run 它的 status 通常被标记为 'done' 或 'completed'
    const validAnswers = workspace.modelRuns
      .filter((r: any) => (r.status === 'done' || r.status === 'completed') && r.content && r.content.trim().length > 0)
      .map((r: any) => ({
        model: r.model,
        content: r.content || ''
      }))

    if (validAnswers.length === 0) {
      return NextResponse.json({ error: 'INSUFFICIENT_RESPONSES' }, { status: 422 })
    }

    const prompt = buildReflectionPrompt(workspace.title || '未知问题', validAnswers)

    const response = await getOpenAI().chat.completions.create({
      model: 'qwen-max',
      messages: [
        { role: 'system', content: 'You are an expert analyst.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2, // 保持稳定
      max_tokens: 1500
    })

    const rawContent = response.choices[0]?.message?.content || ''
    const cleanedJson = cleanLLMJsonOutput(rawContent)

    try {
      const reflection = JSON.parse(cleanedJson)
      return NextResponse.json({ reflection })
    } catch {
      console.error('Reflection parse error. Raw:', rawContent)
      return NextResponse.json({ error: 'PARSE_ERROR' }, { status: 500 })
    }
  } catch (error) {
    console.error('Reflection API error:', error)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
