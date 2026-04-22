'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMultiStream } from '@/hooks/useMultiStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type WorkspaceData = {
  id: string
  title: string
  prompt: string
  status: string
  selectedModels: string[]
  modelRuns: { id: string; model: string; status: string; content: string }[]
  sceneSessions: {
    id: string
    sceneType: string
    status: string
    finalDrafts: { id: string; content: string; version: number }[]
  }[]
}

const SCENE_BUTTONS = [
  {
    key: 'compare',
    label: '对比表格',
    desc: '结构化对比分析',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: 'brainstorm',
    label: '共识分歧',
    desc: '分析观点碰撞',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    key: 'compose',
    label: '创意合成',
    desc: '多源整合成稿',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    key: 'review',
    label: '审稿意见',
    desc: '汇总修改建议',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

const MODEL_STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-400',
  completed: 'bg-green-400',
  streaming: 'bg-yellow-400 animate-pulse',
  running: 'bg-yellow-400 animate-pulse',
  queued: 'bg-gray-300',
  error: 'bg-red-400',
  failed: 'bg-red-400',
}

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recommendation, setRecommendation] = useState<{ scene: string; reason: string } | null>(null)
  const [showRecommendReason, setShowRecommendReason] = useState(false)

  // 旁观者和灵光一闪
  const [observerContent, setObserverContent] = useState<string | null>(null)
  const [sparkContent, setSparkContent] = useState<string | null>(null)
  const [observerLoading, setObserverLoading] = useState(false)
  const [sparkLoading, setSparkLoading] = useState(false)
  const [showDrawer, setShowDrawer] = useState<'observer' | 'spark' | null>(null)

  // 对话框
  const [chatInput, setChatInput] = useState('')
  const [chatProcessing, setChatProcessing] = useState(false)

  // 中栏 AI 卡片激活态
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

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

  // SSE 流式
  const runsToStream = workspace?.modelRuns
    ?.filter(r => r.status === 'queued' || r.status === 'running')
    ?.map(r => ({ id: r.id, model: r.model })) ?? []

  const { streams, allDone, completedCount, total } = useMultiStream(
    runsToStream.length > 0 ? wsId : null,
    runsToStream
  )

  function getContent(run: { id: string; content: string }): string {
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

  // 获取最新的最终稿
  const latestDraft = workspace?.sceneSessions
    ?.flatMap(s => s.finalDrafts)
    ?.sort((a, b) => b.version - a.version)[0] ?? null

  function handleSceneClick(scene: string) {
    router.push('/workspace/' + wsId + '/scene/' + scene)
  }

  async function handleObserver() {
    try {
      setObserverLoading(true)
      setShowDrawer('observer')
      const res = await fetch('/api/workspaces/' + wsId + '/observer', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setObserverContent(data.content)
    } catch (e) {
      alert(e instanceof Error ? e.message : '旁观者调用失败')
    } finally {
      setObserverLoading(false)
    }
  }

  async function handleSpark() {
    try {
      setSparkLoading(true)
      setShowDrawer('spark')
      const res = await fetch('/api/workspaces/' + wsId + '/spark', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSparkContent(data.content)
    } catch (e) {
      alert(e instanceof Error ? e.message : '灵光一闪调用失败')
    } finally {
      setSparkLoading(false)
    }
  }

  async function handleChatSubmit() {
    const input = chatInput.trim()
    if (!input || chatProcessing) return
    setChatProcessing(true)
    try {
      const res = await fetch('/api/workspaces/' + wsId + '/recommend-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: input }),
      })
      const data = await res.json()
      if (data.scene && ['compare', 'brainstorm', 'compose', 'review'].includes(data.scene)) {
        router.push('/workspace/' + wsId + '/scene/' + data.scene)
      } else {
        alert('暂时无法理解你的指令，请尝试使用场景按钮')
      }
    } catch {
      alert('处理失败，请重试')
    } finally {
      setChatProcessing(false)
      setChatInput('')
    }
  }

  // 左栏 AI 点击滚动到对应卡片
  function scrollToRun(runId: string) {
    setActiveRunId(runId)
    document.getElementById('run-' + runId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (loading) {
    return (
      <main className="flex h-screen bg-[radial-gradient(circle,_rgba(0,0,0,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-inkLight text-sm">加载工作台...</p>
        </div>
      </main>
    )
  }

  if (!workspace) {
    return (
      <main className="flex h-screen bg-[radial-gradient(circle,_rgba(0,0,0,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] items-center justify-center">
        <div className="text-inkLight">工作台不存在</div>
      </main>
    )
  }

  const runs = workspace.modelRuns

  return (
    <main className="flex h-screen bg-[radial-gradient(circle,_rgba(0,0,0,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] text-ink">
      {/* ===== 左栏：导航 ===== */}
      <aside className="hidden md:flex w-56 border-r border-gray-200 bg-white/80 backdrop-blur-sm flex-col shrink-0">
        {/* 顶部 */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-inkLight hover:text-accent flex items-center gap-1 mb-3 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            返回首页
          </button>
          <div className="text-sm font-semibold text-ink truncate">{workspace.title}</div>
          <div className="text-[10px] font-mono text-black/20 mt-1 tracking-wider">ROUND NAV · SEC-A</div>
        </div>

        {/* AI 模型列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-mono text-black/20 mb-2 tracking-wider px-2">AI SOURCES</div>
          {runs.map(run => {
            const status = getStatus(run)
            const isActive = activeRunId === run.id
            return (
              <button
                key={run.id}
                onClick={() => scrollToRun(run.id)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-accent/10 text-accent' : 'text-inkLight hover:bg-gray-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${MODEL_STATUS_COLORS[status] || 'bg-gray-300'}`} />
                <span className="truncate">{run.model}</span>
              </button>
            )
          })}
        </div>

        {/* 底部：旁观者 */}
        <div className="p-3 border-t border-gray-200 space-y-2">
          <button
            onClick={handleObserver}
            disabled={observerLoading || completedCount < 2}
            className="w-full flex items-center gap-2 text-xs text-inkLight hover:text-accent py-2 px-3 rounded-lg border border-gray-200 hover:border-accent transition disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {observerLoading ? '分析中...' : '旁观者视角'}
          </button>
        </div>
      </aside>

      {/* ===== 中栏：审阅区 ===== */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏 */}
        <div className="h-11 shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">Gambit</span>
            {!allDone && (
              <span className="text-xs text-inkLight bg-yellow-50 px-2 py-0.5 rounded-full">
                {completedCount}/{total} 已完成
              </span>
            )}
            {allDone && completedCount >= 2 && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                全部完成
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-black/20 tracking-wider">REVIEW DESK · SEC-B</span>
        </div>

        {/* 问题展示 */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="text-[10px] font-mono text-black/20 mb-1">QUERY</div>
          <div className="text-sm text-ink">{workspace.prompt}</div>
        </div>

        {/* AI 输出卡片区 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className={`grid gap-4 ${runs.length <= 2 ? 'grid-cols-2' : runs.length <= 3 ? 'grid-cols-3' : 'grid-cols-3'}`}>
            {runs.map(run => {
              const content = getContent(run)
              const status = getStatus(run)

              return (
                <div
                  key={run.id}
                  id={'run-' + run.id}
                  className={`bg-white border rounded-2xl overflow-hidden flex flex-col shadow-sm transition ${
                    activeRunId === run.id ? 'border-accent ring-1 ring-accent/20' : 'border-gray-200'
                  }`}
                >
                  {/* 卡片头 */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${MODEL_STATUS_COLORS[status] || 'bg-gray-300'}`} />
                      <span className="font-medium text-sm text-ink">{run.model}</span>
                    </div>
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
                  <div className="px-4 py-3 flex-1 overflow-y-auto max-h-[400px] text-sm">
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
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
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
                      <button
                        onClick={() => navigator.clipboard.writeText(content)}
                        className="text-xs text-inkLight hover:text-accent transition"
                      >
                        复制
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 底部操作栏 */}
        {allDone && completedCount >= 2 && (
          <div className="border-t border-gray-200 bg-white px-6 py-3 shrink-0">
            {/* 推荐 */}
            {recommendation && (
              <div className="mb-3">
                <button
                  onClick={() => setShowRecommendReason(!showRecommendReason)}
                  className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                  建议进入【{SCENE_BUTTONS.find(s => s.key === recommendation.scene)?.label}】
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={showRecommendReason ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                  </svg>
                </button>
                {showRecommendReason && (
                  <div className="mt-1 text-xs text-inkLight bg-gray-50 rounded-lg px-3 py-2">
                    {recommendation.reason}
                  </div>
                )}
              </div>
            )}

            {/* 场景按钮 */}
            <div className="flex items-center gap-2 mb-3">
              {SCENE_BUTTONS.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => handleSceneClick(btn.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition ${
                    recommendation?.scene === btn.key
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-ink border-gray-200 hover:border-accent'
                  }`}
                >
                  {btn.icon}
                  <div className="text-left">
                    <div className="font-medium leading-tight">{btn.label}</div>
                    <div className={`text-[10px] ${recommendation?.scene === btn.key ? 'text-white/70' : 'text-inkLight'}`}>{btn.desc}</div>
                  </div>
                </button>
              ))}

              <div className="ml-auto">
                <button
                  onClick={handleSpark}
                  disabled={sparkLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-inkLight hover:border-accent hover:text-accent transition disabled:opacity-40"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  {sparkLoading ? '思考中...' : '灵光一闪'}
                </button>
              </div>
            </div>

            {/* 对话框 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit() } }}
                  placeholder="输入指令，如「帮我对比一下价格」「分析各方观点」..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-accent transition bg-gray-50"
                  disabled={chatProcessing}
                />
              </div>
              <button
                onClick={handleChatSubmit}
                disabled={chatProcessing || !chatInput.trim()}
                className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30 hover:bg-accent/85 transition shrink-0"
              >
                {chatProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===== 右栏：最终稿 ===== */}
      <aside className="hidden lg:flex w-72 border-l border-gray-200 bg-white/80 backdrop-blur-sm flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">最终稿</span>
            <span className="text-[10px] font-mono text-black/20 tracking-wider">OUTPUT · SEC-C</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {latestDraft ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  h1: ({children}) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                  h2: ({children}) => <h2 className="text-base font-bold my-2">{children}</h2>,
                  h3: ({children}) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                  p: ({children}) => <p className="my-1 text-sm leading-relaxed">{children}</p>,
                  ul: ({children}) => <ul className="list-disc pl-4 my-1 text-sm">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-4 my-1 text-sm">{children}</ol>,
                  li: ({children}) => <li className="leading-relaxed">{children}</li>,
                  code: ({children}) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                }}>{latestDraft.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200 mb-3">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div className="text-sm text-inkLight">暂无最终稿</div>
              <div className="text-xs text-inkLight/60 mt-1">使用下方场景工具后<br />这里将显示生成结果</div>
            </div>
          )}
        </div>

        {latestDraft && (
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => latestDraft && navigator.clipboard.writeText(latestDraft.content)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 text-sm text-inkLight hover:bg-gray-50 hover:border-accent transition"
            >
              复制全文
            </button>
          </div>
        )}
      </aside>

      {/* ===== 旁观者/灵光一闪抽屉 ===== */}
      {showDrawer && (
        <>
          <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setShowDrawer(null)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
            <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
              <span className="font-semibold text-sm flex items-center gap-2">
                {showDrawer === 'observer' ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>旁观者视角</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>灵光一闪</>
                )}
              </span>
              <button onClick={() => setShowDrawer(null)} className="text-inkLight hover:text-ink transition">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(showDrawer === 'observer' && observerLoading) || (showDrawer === 'spark' && sparkLoading) ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {(showDrawer === 'observer' ? observerContent : sparkContent) || ''}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-3 shrink-0">
              <button
                onClick={() => {
                  const content = showDrawer === 'observer' ? observerContent : sparkContent
                  if (content) navigator.clipboard.writeText(content)
                }}
                className="w-full text-sm text-inkLight hover:text-accent py-2 border border-gray-200 rounded-lg transition"
              >
                复制内容
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
