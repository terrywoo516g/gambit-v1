# Phase 0 Brief：基础框架重构

## 目标

重构数据模型、API 路由和前端页面，建立"输入 → 多模型并行输出 → 操作栏浮现"的基础框架。

完成后用户可以：
1. 在首页输入问题、选择 AI 模型
2. 点击"开始协作"跳转到工作台
3. 看到多个 AI 同时流式输出回答
4. 所有 AI 输出完成后，底部浮现四个场景按钮（点击暂显"即将上线"占位）

## 不动的文件

以下文件绝对不修改：
- `src/lib/llm-client.ts`
- `src/lib/utils.ts`
- `src/lib/db.ts`
- `src/prompts/**`（所有 prompt 文件保留，后续 Phase 会复用）
- `src/hooks/useMessageStream.ts`（保留，本 Phase 会新建一个多流 hook 替代使用）
- `prisma/migrations/**`（旧 migration 保留，新增 migration）

## 删除的文件

以下文件删除：
- `src/components/MentionInput.tsx`
- `src/components/ArtifactPanel.tsx`
- `src/app/api/tool/invoke/route.ts`
- `src/app/api/chat/send/route.ts`
- `src/app/api/message/[id]/retry/route.ts`
- `src/app/api/stream/[messageId]/route.ts`
- `src/app/api/workspace/create/route.ts`
- `src/app/api/workspace/[id]/route.ts`
- `src/app/api/workspace/list/route.ts`
- `src/app/api/workspaces/route.ts`

## 第一步：更新 Prisma Schema

替换 `prisma/schema.prisma` 的全部内容：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Workspace {
  id             String         @id @default(uuid())
  userId         String?
  deviceId       String?
  prompt         String
  selectedModels String         // JSON string: '["DeepSeek V3.2","豆包 Seed 2.0 Pro","Kimi K2.5"]'
  status         String         @default("pending") // pending / running / completed / archived
  title          String         @default("新工作台")
  recommendScene String?        // compare / brainstorm / compose / review
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  modelRuns      ModelRun[]
  sceneSessions  SceneSession[]
  artifacts      Artifact[]
}

model ModelRun {
  id          String    @id @default(uuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  model       String    // 模型显示名，如 "DeepSeek V3.2"
  modelId     String    // 模型 API ID，如 "deepseek/deepseek-v3.2-251201"
  status      String    @default("queued") // queued / running / completed / failed
  content     String    @default("")
  error       String?
  tokens      Int?
  cost        Float?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())
}

model SceneSession {
  id             String       @id @default(uuid())
  workspaceId    String
  workspace      Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  sceneType      String       // compose / brainstorm / review / compare
  userSelections String       @default("{}") // JSON string
  status         String       @default("active") // active / completed / abandoned
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  finalDrafts    FinalDraft[]
}

model Artifact {
  id          String   @id @default(uuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  type        String   // reflection / review_suggestions / comparison_table / observer / spark
  payload     String   @default("{}") // JSON string
  version     Int      @default(1)
  createdAt   DateTime @default(now())
}

model FinalDraft {
  id             String       @id @default(uuid())
  sceneSessionId String
  sceneSession   SceneSession @relation(fields: [sceneSessionId], references: [id], onDelete: Cascade)
  content        String
  format         String       @default("markdown") // markdown / html / json
  version        Int          @default(1)
  createdAt      DateTime     @default(now())
}

model LlmCall {
  id        String   @id @default(uuid())
  runId     String?
  provider  String
  model     String
  tokensIn  Int
  tokensOut Int
  latency   Int
  cost      Float
  status    String
  createdAt DateTime @default(now())
}
```

执行迁移：
```bash
npx prisma migrate dev --name v2_restructure
```

如果 migrate 因为已有数据冲突而失败，执行：
```bash
rm -rf prisma/migrations
rm -f prisma/dev.db
npx prisma migrate dev --name v2_init
```

## 第二步：新建模型注册表

新建文件 `src/lib/model-registry.ts`：

```typescript
export interface ModelInfo {
  id: string          // 显示名，用于前端展示和 ModelRun.model 字段
  apiId: string       // 七牛云 API 的 model ID
  provider: string    // 厂商名
  description: string // 一句话描述
  contextLength: string
  inputPrice: string  // 每 K tokens
  outputPrice: string
}

export const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: 'DeepSeek V3.2',
    apiId: 'deepseek/deepseek-v3.2-251201',
    provider: 'DeepSeek',
    description: '主力通用模型',
    contextLength: '128K',
    inputPrice: '0.002',
    outputPrice: '0.003',
  },
  {
    id: 'DeepSeek R1',
    apiId: 'deepseek-r1-0528',
    provider: 'DeepSeek',
    description: '深度思考推理',
    contextLength: '128K',
    inputPrice: '0.004',
    outputPrice: '0.016',
  },
  {
    id: 'Kimi K2.6',
    apiId: 'moonshotai/kimi-k2.6',
    provider: 'Moonshot',
    description: '最新旗舰，长上下文',
    contextLength: '262K',
    inputPrice: '0.0065',
    outputPrice: '0.027',
  },
  {
    id: 'Kimi K2.5',
    apiId: 'moonshotai/kimi-k2.5',
    provider: 'Moonshot',
    description: '性价比版 Kimi',
    contextLength: '256K',
    inputPrice: '0.004',
    outputPrice: '0.021',
  },
  {
    id: 'GLM 5.1',
    apiId: 'z-ai/glm-5.1',
    provider: '智谱',
    description: '国产顶级，编程强',
    contextLength: '200K',
    inputPrice: '0.006',
    outputPrice: '0.024',
  },
  {
    id: 'GLM 5',
    apiId: 'z-ai/glm-5',
    provider: '智谱',
    description: '稳定版 GLM',
    contextLength: '200K',
    inputPrice: '0.004',
    outputPrice: '0.018',
  },
  {
    id: '豆包 Seed 2.0 Pro',
    apiId: 'doubao-seed-2.0-pro',
    provider: '字节跳动',
    description: '多模态理解',
    contextLength: '256K',
    inputPrice: '0.0032',
    outputPrice: '0.016',
  },
  {
    id: '豆包 Seed 2.0 Mini',
    apiId: 'doubao-seed-2.0-mini',
    provider: '字节跳动',
    description: '超低成本日常问答',
    contextLength: '256K',
    inputPrice: '0.0002',
    outputPrice: '0.002',
  },
  {
    id: 'Qwen3 Max',
    apiId: 'qwen3-max',
    provider: '阿里云',
    description: '阿里旗舰模型',
    contextLength: '262K',
    inputPrice: '0.006',
    outputPrice: '0.024',
  },
  {
    id: 'Qwen3.5 Plus',
    apiId: 'qwen/qwen3.5-plus',
    provider: '阿里云',
    description: '超长上下文 1000K',
    contextLength: '1000K',
    inputPrice: '0.0008',
    outputPrice: '0.0048',
  },
  {
    id: 'MiniMax M2.7',
    apiId: 'minimax/minimax-m2.7',
    provider: 'MiniMax',
    description: '性价比编程模型',
    contextLength: '204K',
    inputPrice: '0.0021',
    outputPrice: '0.0084',
  },
  {
    id: 'MiniMax M1',
    apiId: 'MiniMax-M1',
    provider: 'MiniMax',
    description: '深度思考 1000K',
    contextLength: '1000K',
    inputPrice: '0.004',
    outputPrice: '0.016',
  },
]

export const DEFAULT_MODELS = ['DeepSeek V3.2', '豆包 Seed 2.0 Pro', 'Kimi K2.5']

export function getModelByName(name: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find(m => m.id === name)
}
```

## 第三步：重写 API 路由

### 3.1 POST/GET /api/workspaces

新建 `src/app/api/workspaces/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// POST: 创建工作空间
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, selectedModels } = body as {
      prompt: string
      selectedModels: string[]
    }

    if (!prompt?.trim() || !selectedModels?.length || selectedModels.length < 2) {
      return NextResponse.json(
        { error: 'prompt and at least 2 selectedModels required' },
        { status: 400 }
      )
    }

    let deviceId = req.cookies.get('deviceId')?.value
    if (!deviceId) {
      deviceId = uuidv4()
    }

    const workspace = await prisma.workspace.create({
      data: {
        id: uuidv4(),
        deviceId,
        prompt: prompt.trim(),
        selectedModels: JSON.stringify(selectedModels),
        title: prompt.trim().slice(0, 30),
        status: 'pending',
      },
    })

    // 为每个模型创建 ModelRun
    const modelRunIds: string[] = []
    for (const modelName of selectedModels) {
      const runId = uuidv4()
      await prisma.modelRun.create({
        data: {
          id: runId,
          workspaceId: workspace.id,
          model: modelName,
          modelId: modelName, // 后续在 stream 时通过 model-registry 查找 apiId
          status: 'queued',
        },
      })
      modelRunIds.push(runId)
    }

    const response = NextResponse.json({
      workspace: {
        id: workspace.id,
        title: workspace.title,
        status: workspace.status,
        selectedModels,
        modelRunIds,
      },
    })

    if (!req.cookies.get('deviceId')) {
      response.cookies.set('deviceId', deviceId, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      })
    }

    return response
  } catch (err) {
    console.error('[POST /api/workspaces]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: 获取工作空间列表
export async function GET(req: NextRequest) {
  try {
    const deviceId = req.cookies.get('deviceId')?.value
    if (!deviceId) {
      return NextResponse.json({ workspaces: [] })
    }

    const workspaces = await prisma.workspace.findMany({
      where: { deviceId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { modelRuns: true } },
      },
    })

    return NextResponse.json({
      workspaces: workspaces.map(w => ({
        id: w.id,
        title: w.title,
        status: w.status,
        selectedModels: JSON.parse(w.selectedModels),
        updatedAt: w.updatedAt,
        modelRunCount: w._count.modelRuns,
      })),
    })
  } catch (err) {
    console.error('[GET /api/workspaces]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 3.2 GET/DELETE /api/workspaces/[id]

新建 `src/app/api/workspaces/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    if (!workspace) {
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
    await prisma.workspace.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/workspaces/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 3.3 GET /api/workspaces/[id]/stream/[runId] — 单个 ModelRun 的 SSE 流

新建 `src/app/api/workspaces/[id]/stream/[runId]/route.ts`：

```typescript
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getModelByName } from '@/lib/model-registry'
import { streamChat } from '@/lib/llm-client'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  const run = await prisma.modelRun.findUnique({ where: { id: params.runId } })
  if (!run) {
    return new Response('ModelRun not found', { status: 404 })
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: params.id } })
  if (!workspace) {
    return new Response('Workspace not found', { status: 404 })
  }

  const modelInfo = getModelByName(run.model)
  if (!modelInfo) {
    return new Response('Model not in registry: ' + run.model, { status: 400 })
  }

  // 更新状态为 running
  await prisma.modelRun.update({
    where: { id: run.id },
    data: { status: 'running', startedAt: new Date() },
  })

  // 同时更新 workspace 状态
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { status: 'running' },
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = ''
        let totalTokensIn = 0
        let totalTokensOut = 0

        // 构建消息：使用 workspace.prompt 作为用户消息
        const messages = [
          { role: 'user' as const, content: workspace.prompt },
        ]

        // 查找 llm-client 中对应的 provider 和 model
        // 注意：需要根据 modelInfo.apiId 解析 provider
        const providerMap: Record<string, string> = {
          'DeepSeek': 'qiniu',
          'Moonshot': 'qiniu',
          '智谱': 'qiniu',
          '字节跳动': 'volcano',
          '阿里云': 'qiniu',
          'MiniMax': 'qiniu',
        }

        const provider = providerMap[modelInfo.provider] || 'qiniu'

        for await (const chunk of streamChat({
          provider: provider as any,
          model: modelInfo.apiId,
          messages,
        })) {
          if (chunk.type === 'token') {
            fullContent += chunk.data
            const event = `data: ${JSON.stringify({ type: 'token', data: chunk.data })}\n\n`
            controller.enqueue(encoder.encode(event))
          }

          if (chunk.type === 'usage') {
            totalTokensIn = chunk.data.promptTokens || 0
            totalTokensOut = chunk.data.completionTokens || 0
          }

          if (chunk.type === 'done') {
            // 保存完成状态
            await prisma.modelRun.update({
              where: { id: run.id },
              data: {
                status: 'completed',
                content: fullContent,
                tokens: totalTokensIn + totalTokensOut,
                completedAt: new Date(),
              },
            })

            // 检查是否所有 run 都完成了
            const allRuns = await prisma.modelRun.findMany({
              where: { workspaceId: workspace.id },
            })
            const allDone = allRuns.every(r =>
              r.id === run.id ? true : r.status === 'completed' || r.status === 'failed'
            )
            if (allDone) {
              await prisma.workspace.update({
                where: { id: workspace.id },
                data: { status: 'completed' },
              })
            }

            const doneEvent = `data: ${JSON.stringify({ type: 'done', data: { tokens: totalTokensIn + totalTokensOut } })}\n\n`
            controller.enqueue(encoder.encode(doneEvent))
            controller.close()
          }
        }
      } catch (err) {
        console.error('[stream error]', err)
        await prisma.modelRun.update({
          where: { id: run.id },
          data: { status: 'failed', error: String(err) },
        })

        const errorEvent = `data: ${JSON.stringify({ type: 'error', data: String(err) })}\n\n`
        controller.enqueue(encoder.encode(errorEvent))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

**重要提示给 Trae**：`streamChat` 函数在 `src/lib/llm-client.ts` 中已经存在。它接受 `{ provider, model, messages }` 参数并返回 async generator。上面的代码直接使用它。如果 `streamChat` 的参数签名不完全匹配，请查看 `llm-client.ts` 的实际导出并调整调用方式，但不要修改 `llm-client.ts` 本身。

### 3.4 POST /api/workspaces/[id]/recommend-scene

新建 `src/app/api/workspaces/[id]/recommend-scene/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: { modelRuns: { where: { status: 'completed' } } },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const prompt = workspace.prompt
    const summaries = workspace.modelRuns
      .map(r => `【${r.model}】：${r.content.slice(0, 500)}`)
      .join('\n\n')

    const systemPrompt = `你是 Gambit 的场景推荐引擎。根据用户的问题和各 AI 的回答摘要，判断最适合的处理场景。

四个场景：
- compare：用户在做调研、选型、对比产品/方案（关键词：推荐、对比、哪个好、有哪些）
- brainstorm：用户面临决策、需要分析利弊、权衡选择（关键词：该不该、要不要、选哪个、是否）
- compose：用户需要创作内容、写文案、生成方案（关键词：写、文案、方案、脚本、帮我生成）
- review：用户需要审阅文档、找问题、提修改意见（关键词：审阅、检查、修改、有没有问题）

请只返回一个 JSON 对象，格式：
{"scene":"compare","confidence":0.85,"reason":"用户在询问产品推荐，适合整理为对比表格"}

不要返回其他任何内容。`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `用户问题：${prompt}\n\n各 AI 回答摘要：\n${summaries}` },
      ],
    })

    let parsed
    try {
      parsed = JSON.parse(result)
    } catch {
      parsed = { scene: 'compare', confidence: 0.5, reason: '无法解析推荐结果，默认推荐对比模式' }
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { recommendScene: parsed.scene },
    })

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[recommend-scene]', err)
    return NextResponse.json(
      { scene: 'compare', confidence: 0.3, reason: '推荐服务异常' },
      { status: 200 }
    )
  }
}
```

## 第四步：新建前端组件和页面

### 4.1 新建 Hook: useMultiStream

新建 `src/hooks/useMultiStream.ts`：

```typescript
'use client'

import { useEffect, useState, useRef } from 'react'

export type RunStream = {
  runId: string
  model: string
  content: string
  status: 'queued' | 'streaming' | 'done' | 'error'
}

export function useMultiStream(
  workspaceId: string | null,
  runs: { id: string; model: string }[]
) {
  const [streams, setStreams] = useState<Record<string, RunStream>>({})
  const sourcesRef = useRef<Record<string, EventSource>>({})
  const startedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!workspaceId || runs.length === 0) return

    // 初始化所有 stream 状态
    const initial: Record<string, RunStream> = {}
    runs.forEach(r => {
      initial[r.id] = { runId: r.id, model: r.model, content: '', status: 'queued' }
    })
    setStreams(initial)

    // 为每个 run 开启 SSE
    runs.forEach(run => {
      if (startedRef.current.has(run.id)) return
      startedRef.current.add(run.id)

      const es = new EventSource(`/api/workspaces/${workspaceId}/stream/${run.id}`)

      es.onmessage = (e) => {
        try {
          const chunk = JSON.parse(e.data)

          if (chunk.type === 'token') {
            setStreams(prev => ({
              ...prev,
              [run.id]: {
                ...prev[run.id],
                content: (prev[run.id]?.content || '') + chunk.data,
                status: 'streaming',
              },
            }))
          }

          if (chunk.type === 'done') {
            setStreams(prev => ({
              ...prev,
              [run.id]: { ...prev[run.id], status: 'done' },
            }))
            es.close()
          }

          if (chunk.type === 'error') {
            setStreams(prev => ({
              ...prev,
              [run.id]: { ...prev[run.id], status: 'error' },
            }))
            es.close()
          }
        } catch {}
      }

      es.onerror = () => {
        setStreams(prev => ({
          ...prev,
          [run.id]: { ...prev[run.id], status: 'error' },
        }))
        es.close()
      }

      sourcesRef.current[run.id] = es
    })

    return () => {
      Object.values(sourcesRef.current).forEach(es => es.close())
      sourcesRef.current = {}
      startedRef.current.clear()
    }
  }, [workspaceId, runs.length])

  const allDone = Object.values(streams).length > 0 &&
    Object.values(streams).every(s => s.status === 'done' || s.status === 'error')

  const completedCount = Object.values(streams).filter(s => s.status === 'done').length

  return { streams, allDone, completedCount, total: runs.length }
}
```

### 4.2 新建首页 `src/app/page.tsx`

完全替换为：

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DEFAULT_MODELS = ['DeepSeek V3.2', '豆包 Seed 2.0 Pro', 'Kimi K2.5']

const ALL_MODELS = [
  { id: 'DeepSeek V3.2', provider: 'DeepSeek' },
  { id: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'Kimi K2.6', provider: 'Moonshot' },
  { id: 'Kimi K2.5', provider: 'Moonshot' },
  { id: 'GLM 5.1', provider: '智谱' },
  { id: 'GLM 5', provider: '智谱' },
  { id: '豆包 Seed 2.0 Pro', provider: '字节跳动' },
  { id: '豆包 Seed 2.0 Mini', provider: '字节跳动' },
  { id: 'Qwen3 Max', provider: '阿里云' },
  { id: 'Qwen3.5 Plus', provider: '阿里云' },
  { id: 'MiniMax M2.7', provider: 'MiniMax' },
  { id: 'MiniMax M1', provider: 'MiniMax' },
]

const EXAMPLES = [
  { text: '推荐几款3000元以内的降噪耳机', scene: 'compare' },
  { text: '我该不该从大厂跳槽去创业公司', scene: 'brainstorm' },
  { text: '帮我写一篇小红书种草文案，主题是露营装备', scene: 'compose' },
  { text: '帮我审阅这份合同，找出潜在风险条款', scene: 'review' },
]

export default function HomePage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string[]>(DEFAULT_MODELS)
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  function toggleModel(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  async function handleSubmit(overrideText?: string) {
    const question = (overrideText ?? text).trim()
    if (!question || loading) return
    if (selected.length < 2) {
      alert('请至少选择 2 个 AI 模型')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question, selectedModels: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/workspace/' + data.workspace.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen blueprint-grid flex flex-col relative">
      <div className="fixed left-6 top-1/2 -translate-y-1/2 font-mono text-[22px] font-bold tracking-[0.15em] text-black/[0.07]" style={{writingMode:'vertical-rl'}}>SECTION A-A</div>
      <div className="fixed right-6 top-1/2 -translate-y-1/2 font-mono text-[22px] font-bold tracking-[0.15em] text-black/[0.07]" style={{writingMode:'vertical-rl'}}>DETAIL B</div>

      <nav className="h-14 border-b border-black/5 flex items-center justify-between px-8 bg-paper/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <img src="/mascot.png" className="w-8 h-8 rounded-full" alt="Gambit" />
          <span className="font-bold text-ink">Gambit</span>
        </div>
        <a href="/workspaces" className="text-sm text-inkLight hover:text-accent transition">历史工作台</a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <img src="/mascot.png" className="w-60 h-60 mb-5 drop-shadow-lg" alt="mascot" />
        <h1 className="text-5xl font-bold text-ink mb-2 tracking-tight">Gambit</h1>
        <p className="text-xl text-inkLight mb-1">你的决定，不该只听一个 AI 的</p>
        <p className="text-sm text-inkLight/60 mb-10">把 AI 的回答变成你能介入的选择题</p>

        {/* 模型选择 */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {selected.map(m => (
            <span key={m} className="inline-flex items-center gap-1 bg-accent text-white rounded-full px-3 py-1 text-sm">
              {m}
              <button onClick={() => toggleModel(m)} className="opacity-70 hover:opacity-100">×</button>
            </span>
          ))}
          <button onClick={() => setShowPicker(!showPicker)}
            className="px-3 py-1 rounded-full text-sm border border-gray-200 bg-white text-inkLight hover:border-accent transition">
            + 添加模型
          </button>
        </div>

        {showPicker && (
          <div className="w-full max-w-2xl mb-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">选择 AI 模型（至少 2 个）</span>
              <button onClick={() => setShowPicker(false)} className="text-inkLight hover:text-ink">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_MODELS.map(m => (
                <button key={m.id} onClick={() => toggleModel(m.id)}
                  className={`text-left px-3 py-2 rounded-xl text-sm border transition ${
                    selected.includes(m.id) ? 'bg-accent text-white border-accent' : 'border-gray-200 hover:border-accent'
                  }`}>
                  <div className="font-medium">{m.id}</div>
                  <div className={`text-xs ${selected.includes(m.id) ? 'text-white/70' : 'text-inkLight'}`}>{m.provider}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 输入框 */}
        <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-sm">
          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }}}
            placeholder="输入你的问题，让多个 AI 同时为你分析..."
            className="w-full min-h-[80px] max-h-[160px] resize-none px-5 py-4 text-sm outline-none bg-transparent rounded-2xl" />
        </div>

        <button onClick={() => handleSubmit()} disabled={loading || !text.trim() || selected.length < 2}
          className="mt-5 bg-ink text-white px-8 py-3 rounded-full text-base font-medium disabled:opacity-30 hover:bg-ink/85 transition">
          {loading ? '正在创建...' : '开始协作'}
        </button>

        {/* 示例 */}
        <div className="w-full max-w-2xl mt-8 grid grid-cols-2 gap-2">
          {EXAMPLES.map(ex => (
            <div key={ex.text} onClick={() => { setText(ex.text) }}
              className="group bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition">
              <p className="text-sm text-ink leading-snug">{ex.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center">
        <span className="text-xs font-mono text-black/20">© 2026 Gambit · MULTI-AI DECISION WORKBENCH</span>
      </footer>
    </div>
  )
}
```

### 4.3 新建工作台页面 `src/app/workspace/[id]/page.tsx`

完全替换为：

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMultiStream, RunStream } from '@/hooks/useMultiStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type WorkspaceData = {
  id: string
  title: string
  prompt: string
  status: string
  selectedModels: string[]
  modelRuns: { id: string; model: string; status: string; content: string }[]
}

const SCENE_BUTTONS = [
  { key: 'compare', label: '帮我整理成对比表格', icon: '📊' },
  { key: 'brainstorm', label: '帮我分析共识和分歧', icon: '⚖️' },
  { key: 'compose', label: '帮我整合成一篇稿子', icon: '📝' },
  { key: 'review', label: '帮我汇总审阅意见', icon: '✅' },
]

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recommendation, setRecommendation] = useState<{ scene: string; reason: string } | null>(null)

  // 加载 workspace
  useEffect(() => {
    if (!wsId) return
    async function load() {
      try {
        const res = await fetch('/api/workspaces/' + wsId)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setWorkspace(data.workspace)
      } catch (e) {
        alert(e instanceof Error ? e.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [wsId])

  // 需要流式输出的 runs
  const runsToStream = workspace?.modelRuns
    ?.filter(r => r.status === 'queued' || r.status === 'running')
    ?.map(r => ({ id: r.id, model: r.model })) ?? []

  const { streams, allDone, completedCount, total } = useMultiStream(
    runsToStream.length > 0 ? wsId : null,
    runsToStream
  )

  // 合并已完成的内容和流式内容
  function getContent(run: { id: string; model: string; status: string; content: string }): string {
    if (streams[run.id]?.content) return streams[run.id].content
    return run.content
  }

  function getStatus(run: { id: string; status: string }): string {
    if (streams[run.id]) return streams[run.id].status
    return run.status
  }

  // 获取场景推荐
  useEffect(() => {
    if (!allDone || !wsId || completedCount < 2) return
    async function recommend() {
      try {
        const res = await fetch('/api/workspaces/' + wsId + '/recommend-scene', { method: 'POST' })
        const data = await res.json()
        setRecommendation({ scene: data.scene, reason: data.reason })
      } catch {}
    }
    void recommend()
  }, [allDone, wsId, completedCount])

  function handleSceneClick(scene: string) {
    // Phase 1-4 会实现具体场景页面，目前显示占位
    alert('「' + SCENE_BUTTONS.find(s => s.key === scene)?.label + '」即将上线，敬请期待！')
  }

  if (loading) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-inkLight">加载中...</div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-inkLight">工作台不存在</div>
      </div>
    )
  }

  const runs = workspace.modelRuns

  return (
    <div className="min-h-screen blueprint-grid flex flex-col">
      {/* 顶部 */}
      <header className="h-14 border-b border-black/5 flex items-center justify-between px-6 bg-paper/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workspaces')} className="text-inkLight hover:text-accent text-sm">← 返回</button>
          <span className="font-semibold text-ink text-sm truncate max-w-[300px]">{workspace.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {!allDone && (
            <span className="text-xs text-inkLight bg-yellow-50 px-2 py-1 rounded-full">
              {completedCount}/{total} 已完成
            </span>
          )}
          {allDone && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              全部完成
            </span>
          )}
        </div>
      </header>

      {/* 问题展示 */}
      <div className="px-6 py-4 border-b border-black/5 bg-white/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs text-inkLight mb-1">你的问题</div>
          <div className="text-sm text-ink">{workspace.prompt}</div>
        </div>
      </div>

      {/* AI 输出卡片区 */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className={`grid gap-4 ${runs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {runs.map(run => {
              const content = getContent(run)
              const status = getStatus(run)

              return (
                <div key={run.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
                  {/* 卡片头 */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-medium text-sm text-ink">{run.model}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      status === 'done' || status === 'completed' ? 'bg-green-50 text-green-600' :
                      status === 'error' || status === 'failed' ? 'bg-red-50 text-red-600' :
                      status === 'streaming' || status === 'running' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {status === 'done' || status === 'completed' ? '已完成' :
                       status === 'error' || status === 'failed' ? '失败' :
                       status === 'streaming' || status === 'running' ? '生成中...' :
                       '等待中'}
                    </span>
                  </div>

                  {/* 卡片内容 */}
                  <div className="px-4 py-3 flex-1 overflow-y-auto max-h-[500px] text-sm">
                    {!content && (status === 'queued' || status === 'streaming' || status === 'running') && (
                      <div className="space-y-2">
                        <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                        <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
                        <div className="h-3 w-52 animate-pulse rounded bg-gray-100" />
                      </div>
                    )}
                    {content && (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        p: ({children}) => <p className="my-1 leading-relaxed">{children}</p>,
                        h1: ({children}) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                        h2: ({children}) => <h2 className="text-base font-bold my-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                        ul: ({children}) => <ul className="list-disc pl-4 my-1">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
                        li: ({children}) => <li className="leading-relaxed">{children}</li>,
                        code: ({children}) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                      }}>{content}</ReactMarkdown>
                    )}
                    {(status === 'error' || status === 'failed') && !content && (
                      <div className="text-red-500 text-sm">生成失败，请刷新重试</div>
                    )}
                  </div>

                  {/* 卡片底部 */}
                  {(status === 'done' || status === 'completed') && content && (
                    <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-inkLight">{content.length} 字</span>
                      <button onClick={() => navigator.clipboard.writeText(content)}
                        className="text-xs text-inkLight hover:text-accent transition">复制</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      {allDone && completedCount >= 2 && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
          <div className="max-w-5xl mx-auto">
            {recommendation && (
              <div className="text-xs text-inkLight mb-3">
                💡 建议进入【{SCENE_BUTTONS.find(s => s.key === recommendation.scene)?.label}】—— {recommendation.reason}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              {SCENE_BUTTONS.map(btn => (
                <button key={btn.key} onClick={() => handleSceneClick(btn.key)}
                  className={`px-4 py-2 rounded-xl text-sm border transition ${
                    recommendation?.scene === btn.key
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-ink border-gray-200 hover:border-accent'
                  }`}>
                  <span className="mr-1">{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 4.4 更新历史列表页 `src/app/workspaces/page.tsx`

完全替换为：

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type WsItem = {
  id: string
  title: string
  status: string
  selectedModels: string[]
  updatedAt: string
  modelRunCount: number
}

export default function WorkspacesPage() {
  const router = useRouter()
  const [list, setList] = useState<WsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/workspaces')
        const data = await res.json()
        setList(data.workspaces ?? [])
      } catch {
        setList([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="min-h-screen blueprint-grid">
      <nav className="h-14 border-b border-black/5 flex items-center justify-between px-8 bg-paper/80">
        <div className="flex items-center gap-2">
          <img src="/mascot.png" className="w-7 h-7 rounded-full" alt="G" />
          <span className="font-bold text-sm">Gambit</span>
        </div>
        <a href="/" className="text-sm text-inkLight hover:text-accent">首页</a>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-10">
        <h1 className="text-2xl font-bold mb-1">历史工作台</h1>
        <p className="text-sm text-inkLight mb-6">{list.length} 个任务</p>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
                <div className="h-4 w-40 rounded bg-gray-100 mb-3" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-inkLight">还没有任务</p>
            <a href="/" className="mt-4 inline-block bg-accent text-white px-5 py-2 rounded-lg text-sm">开始第一次协作</a>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(w => (
              <div key={w.id} onClick={() => router.push('/workspace/' + w.id)}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 hover:border-accent transition">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{w.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-inkLight">{new Date(w.updatedAt).toLocaleString('zh-CN')}</span>
                    <button onClick={e => {
                      e.stopPropagation()
                      if (confirm('确定删除？')) {
                        fetch('/api/workspaces/' + w.id, { method: 'DELETE' })
                          .then(r => { if (r.ok) setList(p => p.filter(x => x.id !== w.id)) })
                      }
                    }} className="hidden group-hover:block text-inkLight hover:text-red-500 text-sm">🗑</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {w.selectedModels.map(m => (
                    <span key={m} className="rounded bg-gray-50 px-2 py-0.5 text-xs text-inkLight">{m}</span>
                  ))}
                  <span className="rounded bg-gray-50 px-2 py-0.5 text-xs text-inkLight">{w.modelRunCount} 个模型</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 4.5 保持 globals.css 和 tailwind.config.ts 不变

这两个文件在之前的 UI 调整中已经配置好了（blueprint-grid 背景、颜色变量等），不需要修改。

### 4.6 保持 layout.tsx 不变

已经在之前配置好了。

## 第五步：清理旧的 API 路由目录结构

删除以下目录和文件（如果 Trae 在第一步已删除则跳过）：
- `src/app/api/chat/` 整个目录
- `src/app/api/tool/` 整个目录
- `src/app/api/message/` 整个目录
- `src/app/api/stream/` 整个目录
- `src/app/api/workspace/` 整个目录（注意：新的 API 在 `src/app/api/workspaces/` 下，带 s）

## 第六步：验证

执行以下命令确认无编译错误：
```bash
pnpm build
```

如果有 ESLint 警告关于 `<img>` 标签，可以忽略（不影响功能）。如果有真正的编译错误，根据错误信息修复。

常见问题：
1. 如果 `react-markdown` 或 `remark-gfm` 未安装，执行 `pnpm add react-markdown remark-gfm`
2. 如果 `uuid` 未安装，执行 `pnpm add uuid @types/uuid`
3. 如果 Prisma client 未生成，执行 `npx prisma generate`

## 完成标志

Phase 0 完成后，用户应该能：
1. 打开首页 → 看到输入框和模型选择
2. 输入问题、选择模型、点击"开始协作"
3. 跳转到工作台 → 看到多个 AI 卡片同时流式输出
4. 所有 AI 完成后 → 底部出现四个场景按钮和智能推荐
5. 点击场景按钮 → 弹出"即将上线"提示（Phase 1-4 会实现具体功能）
6. 历史列表页正常工作
```
