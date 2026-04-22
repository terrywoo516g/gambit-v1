# Phase 4.5 Brief：工作台对话框 + SSE 并发延迟修复

## 目标

1. 在工作台底部操作栏增加对话输入框（路线 A 简单版：用户输入自然语言，系统识别意图后路由到对应场景）
2. 修复多模型 SSE 并发启动导致中间卡片失败的问题（给 SSE 连接加启动延迟）

## 不动的文件

- `src/lib/llm-client.ts`
- `src/lib/utils.ts`
- `src/lib/db.ts`
- `src/lib/model-registry.ts`
- `src/hooks/useMessageStream.ts`
- `src/prompts/**`
- `src/app/page.tsx`
- `src/app/workspaces/page.tsx`
- 所有 `src/app/workspace/[id]/scene/` 下的场景页面（Phase 1-4 已完成）
- 所有 `src/app/api/workspaces/[id]/scenes/` 下的 API 路由
- `src/app/api/scenes/[sceneId]/selections/route.ts`
- `src/app/api/scenes/[sceneId]/generate/route.ts`

## 第一步：修改 useMultiStream.ts 加启动延迟

修改 `src/hooks/useMultiStream.ts`：

将 `runs.forEach` 循环改为带延迟的启动逻辑。找到这段代码：

```typescript
// 为每个 run 开启 SSE
runs.forEach(run => {
  if (startedRef.current.has(run.id)) return
  startedRef.current.add(run.id)

  const es = new EventSource(`/api/workspaces/${workspaceId}/stream/${run.id}`)
```

替换为：

```typescript
// 为每个 run 开启 SSE（加延迟，避免 SQLite 并发写入冲突）
runs.forEach((run, index) => {
  if (startedRef.current.has(run.id)) return
  startedRef.current.add(run.id)

  const delay = index * 800 // 第1个立即启动，第2个延迟800ms，第3个延迟1600ms

  setTimeout(() => {
    const es = new EventSource(`/api/workspaces/${workspaceId}/stream/${run.id}`)
```

同时需要把对应的 `es.onmessage`、`es.onerror`、`sourcesRef.current[run.id] = es` 这些代码都包进 `setTimeout` 的回调里。

完整替换后的 `useMultiStream.ts`：

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
  const timersRef = useRef<NodeJS.Timeout[]>([])

  useEffect(() => {
    if (!workspaceId || runs.length === 0) return

    // 初始化所有 stream 状态
    const initial: Record<string, RunStream> = {}
    runs.forEach(r => {
      initial[r.id] = { runId: r.id, model: r.model, content: '', status: 'queued' }
    })
    setStreams(initial)

    // 为每个 run 开启 SSE（加延迟，避免 SQLite 并发写入冲突）
    runs.forEach((run, index) => {
      if (startedRef.current.has(run.id)) return
      startedRef.current.add(run.id)

      const delay = index * 800

      const timer = setTimeout(() => {
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
      }, delay)

      timersRef.current.push(timer)
    })

    return () => {
      timersRef.current.forEach(t => clearTimeout(t))
      timersRef.current = []
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

## 第二步：修改工作台页面，增加底部对话框

修改 `src/app/workspace/[id]/page.tsx`：

### 2a. 在组件顶部新增 state

在已有的 state 声明区域，添加：

```typescript
const [chatInput, setChatInput] = useState('')
const [chatProcessing, setChatProcessing] = useState(false)
```

### 2b. 新增处理函数

在 `handleSceneClick` 函数后面，添加：

```typescript
async function handleChatSubmit() {
  const input = chatInput.trim()
  if (!input || chatProcessing) return

  setChatProcessing(true)
  try {
    // 调用推荐 API，用用户的自然语言输入来判断意图
    const res = await fetch('/api/workspaces/' + wsId + '/recommend-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage: input }),
    })
    const data = await res.json()

    if (data.scene && ['compare', 'brainstorm', 'compose', 'review'].includes(data.scene)) {
      router.push('/workspace/' + wsId + '/scene/' + data.scene)
    } else {
      alert('暂时无法理解你的指令，请尝试使用上方的场景按钮')
    }
  } catch {
    alert('处理失败，请重试')
  } finally {
    setChatProcessing(false)
    setChatInput('')
  }
}
```

### 2c. 修改底部操作栏 JSX

找到底部操作栏的代码块（`{allDone && completedCount >= 2 && (` 开头的部分），替换整个块为：

```jsx
{/* 底部操作栏 */}
{allDone && completedCount >= 2 && (
  <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
    <div className="max-w-5xl mx-auto">
      {recommendation && (
        <div className="text-xs text-inkLight mb-3">
          💡 建议进入【{SCENE_BUTTONS.find(s => s.key === recommendation.scene)?.label}】—— {recommendation.reason}
        </div>
      )}
      <div className="flex items-center justify-center gap-3 mb-3">
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
      {/* 对话输入框 */}
      <div className="flex items-center gap-2 max-w-2xl mx-auto">
        <div className="flex-1 relative">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit() }}}
            placeholder="告诉我你想做什么，比如「帮我对比一下价格」「分析一下各方观点」..."
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-accent transition bg-gray-50"
            disabled={chatProcessing}
          />
        </div>
        <button
          onClick={handleChatSubmit}
          disabled={chatProcessing || !chatInput.trim()}
          className="px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-medium disabled:opacity-30 hover:bg-ink/85 transition shrink-0"
        >
          {chatProcessing ? '理解中...' : '发送'}
        </button>
      </div>
    </div>
  </div>
)}
```

## 第三步：修改 recommend-scene API 支持用户自然语言输入

修改 `src/app/api/workspaces/[id]/recommend-scene/route.ts`：

在 POST 函数开头，解析 body 获取可选的 userMessage：

找到：
```typescript
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await prisma.workspace.findUnique({
```

替换为：
```typescript
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let userMessage = ''
    try {
      const body = await req.json()
      userMessage = body.userMessage || ''
    } catch {
      // 没有 body 也可以，兼容原来无 body 的调用
    }

    const workspace = await prisma.workspace.findUnique({
```

然后找到 systemPrompt 的定义，在末尾追加一段处理 userMessage 的逻辑。找到：

```typescript
const result = await chatOnce({
```

在它前面，修改 user message 的构建逻辑：

```typescript
    const userContent = userMessage
      ? `用户问题：${prompt}\n\n各 AI 回答摘要：\n${summaries}\n\n用户的新指令：${userMessage}\n\n请根据用户的新指令判断最适合的场景。`
      : `用户问题：${prompt}\n\n各 AI 回答摘要：\n${summaries}`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })
```

注意要把原来的 messages 里的 user content 替换成上面的 `userContent` 变量。

## 第四步：验证

```bash
pnpm build
```

## 完成标志

Phase 4.5 完成后：

1. 工作台底部除了四个场景按钮外，还有一个输入框，用户可以输入自然语言指令
2. 输入"帮我对比一下"会自动跳转到对比场景，输入"分析共识"会跳转到头脑风暴场景
3. 多模型 SSE 流式输出不再出现中间卡片失败的问题（或大幅减少）
4. 回车键可以提交输入框内容
```
