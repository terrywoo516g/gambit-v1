'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMultiStream } from '@/hooks/useMultiStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, Plus, Eye, Zap, Copy, Send, Loader2,
  LayoutGrid, MessageSquare, Pencil, FileCheck,
  ChevronDown, ChevronUp, FileText, Home
} from 'lucide-react'

import CompareScene from '@/components/scenes/CompareScene'
import BrainstormScene from '@/components/scenes/BrainstormScene'
import ComposeScene from '@/components/scenes/ComposeScene'
import ReviewScene from '@/components/scenes/ReviewScene'

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

type SceneKey = 'compare' | 'brainstorm' | 'compose' | 'review'

const SCENE_DEFS: { key: SceneKey; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'compare', label: '对比表格', desc: '结构化对比分析', icon: <LayoutGrid className="w-4 h-4" /> },
  { key: 'brainstorm', label: '共识分歧', desc: '分析观点碰撞', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'compose', label: '创意合成', desc: '多源整合成稿', icon: <Pencil className="w-4 h-4" /> },
  { key: 'review', label: '审稿意见', desc: '汇总修改建议', icon: <FileCheck className="w-4 h-4" /> },
]

const MODEL_STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-400',
  completed: 'bg-green-400',
  streaming: 'bg-blue-400 animate-pulse',
  running: 'bg-blue-400 animate-pulse',
  retrying: 'bg-yellow-400 animate-pulse',
  queued: 'bg-gray-300',
  error: 'bg-red-400',
  failed: 'bg-red-400',
}

const STEPS = [
  { key: 'models', label: 'AI 回答' },
  { key: 'scene', label: '场景分析' },
  { key: 'output', label: '最终稿' },
] as const

type StepKey = typeof STEPS[number]['key']

import MentionTextarea from '@/components/MentionTextarea'

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recommendation, setRecommendation] = useState<{ scene: string; reason: string } | null>(null)
  const [showRecommendReason, setShowRecommendReason] = useState(false)

  const [observerContent, setObserverContent] = useState<string | null>(null)
  const [sparkContent, setSparkContent] = useState<string | null>(null)
  const [observerLoading, setObserverLoading] = useState(false)
  const [sparkLoading, setSparkLoading] = useState(false)
  const [showDrawer, setShowDrawer] = useState<'observer' | 'spark' | null>(null)

  const [activeStep, setActiveStep] = useState<StepKey>('models')
  const [activeScene, setActiveScene] = useState<SceneKey | null>(null)
  const [draftContent, setDraftContent] = useState<string | null>(null)

  const [chatInput, setChatInput] = useState('')
  const [chatProcessing, setChatProcessing] = useState(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const loadWorkspace = useCallback(async () => {
    if (!wsId) return
    try {
      const res = await fetch('/api/workspaces/' + wsId)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWorkspace(data.workspace)
      const latest = data.workspace.sceneSessions
        ?.flatMap((s: WorkspaceData['sceneSessions'][0]) => s.finalDrafts)
        ?.sort((a: { version: number }, b: { version: number }) => b.version - a.version)[0]
      if (latest) setDraftContent(latest.content)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [wsId])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

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

  useEffect(() => {
    if (!allDone || !wsId || completedCount < 2) return
    async function recommend() {
      try {
        const res = await fetch('/api/workspaces/' + wsId + '/recommend-scene', { method: 'POST' })
        const data = await res.json()
        setRecommendation({ scene: data.scene, reason: data.reason })
      } catch { /* ignore */ }
    }
    void recommend()
  }, [allDone, wsId, completedCount])

  const handleDraftGenerated = useCallback((content: string) => {
    setDraftContent(content)
    setActiveStep('output')
  }, [])

  function enterScene(key: SceneKey) {
    setActiveScene(key)
    setActiveStep('scene')
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
    
    // Parse mentions and plain text
    const mentionRegex = /@\[(.*?)\]\((.*?)\)/g
    const mentionIds: string[] = []
    let match
    while ((match = mentionRegex.exec(input)) !== null) {
      mentionIds.push(match[2])
    }
    const plainText = input.replace(mentionRegex, '').trim()

    try {
      const res = await fetch('/api/workspaces/' + wsId + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: plainText || input, mentionIds }),
      })
      const data = await res.json()
      
      if (data.intent === 'update_cards') {
        // Just clear the input, the stream hook will pick up the queued models automatically
        setChatInput('')
        setActiveStep('models')
        setActiveScene(null)
        void loadWorkspace()
      } else if (data.intent === 'final_draft') {
        setChatInput('')
        // Open the output view and stream the text manually
        setActiveStep('output')
        setActiveScene(null)
        setDraftContent('')
        
        const streamRes = await fetch('/api/workspaces/' + wsId + '/chat/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: data.sessionId, userMessage: plainText || input }),
        })
        
        if (!streamRes.ok || !streamRes.body) throw new Error('Stream failed')
        
        const reader = streamRes.body.getReader()
        const decoder = new TextDecoder()
        let content = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          content += decoder.decode(value, { stream: true })
          setDraftContent(content)
        }
      } else {
        alert('无法理解你的指令，请重试')
      }
    } catch (e) {
      console.error(e)
      alert('处理失败，请重试')
    } finally {
      setChatProcessing(false)
    }
  }

  function scrollToRun(runId: string) {
    setActiveRunId(runId)
    setActiveStep('models')
    setActiveScene(null)
    setTimeout(() => {
      document.getElementById('run-' + runId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  async function retryRun(runId: string) {
    try {
      // 重置后端状态
      await fetch(`/api/workspaces/${wsId}/retry/${runId}`, { method: 'POST' })
      // 刷新页面数据来重新触发 SSE
      window.location.reload()
    } catch {
      alert('重试失败，请刷新页面')
    }
  }

  if (loading) {
    return (
      <main className="flex h-screen bg-[radial-gradient(circle,_rgba(0,0,0,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
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

  // ========== JSX 部分在任务 8B 中补充 ==========
  return (
    <main className="flex h-screen bg-[radial-gradient(circle,_rgba(0,0,0,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] text-ink">
      {/* ===== 左栏：导航 ===== */}
      <aside className="hidden md:flex w-56 border-r border-gray-200 bg-white/80 backdrop-blur-sm flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <button onClick={() => router.push('/')}
            className="text-xs text-inkLight hover:text-accent flex items-center gap-1 mb-3 transition">
            <ArrowLeft className="w-3.5 h-3.5" /> 返回首页
          </button>
          <div className="text-sm font-semibold text-ink truncate">{workspace.title}</div>
          <div className="text-[10px] font-mono text-black/20 mt-1 tracking-wider">GAMBIT WORKSPACE</div>
        </div>

        <div className="p-3 border-b border-gray-100">
          <div className="text-[10px] font-mono text-black/20 mb-2 tracking-wider px-2">STEPS</div>
          {STEPS.map((step, idx) => (
            <button key={step.key}
              onClick={() => { setActiveStep(step.key); if (step.key === 'models') setActiveScene(null) }}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition mb-0.5 ${
                activeStep === step.key ? 'bg-accent/10 text-accent font-medium' : 'text-inkLight hover:bg-gray-50'
              }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${
                activeStep === step.key ? 'bg-accent text-white' : 'bg-gray-200 text-inkLight'
              }`}>{idx + 1}</span>
              {step.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-mono text-black/20 mb-2 tracking-wider px-2">AI SOURCES</div>
          {runs.map(run => {
            const status = getStatus(run)
            const isActive = activeRunId === run.id
            return (
              <button key={run.id} onClick={() => scrollToRun(run.id)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-accent/10 text-accent' : 'text-inkLight hover:bg-gray-50'
                }`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${MODEL_STATUS_COLORS[status] || 'bg-gray-300'}`} />
                <span className="truncate">{run.model}</span>
              </button>
            )
          })}
        </div>

        <div className="p-3 border-t border-gray-200 space-y-2">
          <button onClick={handleObserver} disabled={observerLoading || completedCount < 2}
            className="w-full flex items-center gap-2 text-xs text-inkLight hover:text-accent py-2 px-3 rounded-lg border border-gray-200 hover:border-accent transition disabled:opacity-40">
            <Eye className="w-3.5 h-3.5" />
            {observerLoading ? '分析中...' : '旁观者视角'}
          </button>
          <button onClick={handleSpark} disabled={sparkLoading || completedCount < 2}
            className="w-full flex items-center gap-2 text-xs text-inkLight hover:text-accent py-2 px-3 rounded-lg border border-gray-200 hover:border-accent transition disabled:opacity-40">
            <Zap className="w-3.5 h-3.5" />
            {sparkLoading ? '思考中...' : '灵光一闪'}
          </button>
        </div>
      </aside>

      {/* ===== 中栏 ===== */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="h-11 shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80 transition">
              <Home className="w-4 h-4 text-accent" />
              <span className="font-bold text-sm text-ink hover:text-accent">Gambit</span>
            </button>
            <div className="h-3 w-[1px] bg-gray-300 mx-1" />
            <button onClick={() => router.push('/')} className="text-xs text-inkLight hover:text-accent flex items-center gap-1 transition">
              <Plus className="w-3 h-3" /> 新建对话
            </button>
            {!allDone && (
              <span className="text-xs text-inkLight bg-yellow-50 px-2 py-0.5 rounded-full ml-2">
                {completedCount}/{total} 已完成
              </span>
            )}
            {allDone && completedCount >= 2 && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">全部完成</span>
            )}
          </div>
          <span className="text-[10px] font-mono text-black/20 tracking-wider">
            {activeScene ? SCENE_DEFS.find(s => s.key === activeScene)?.label?.toUpperCase() : 'REVIEW DESK'}
          </span>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="text-[10px] font-mono text-black/20 mb-1">QUERY</div>
          <div className="text-sm text-ink">{workspace.prompt}</div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeStep === 'models' && !activeScene && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className={`grid gap-4 ${runs.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {runs.map(run => {
                  const content = getContent(run)
                  const status = getStatus(run)
                  return (
                    <div key={run.id} id={'run-' + run.id}
                      className={`bg-white border rounded-2xl overflow-hidden flex flex-col shadow-sm transition ${
                        activeRunId === run.id ? 'border-accent ring-1 ring-accent/20' : 'border-gray-200'
                      }`}>
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${MODEL_STATUS_COLORS[status] || 'bg-gray-300'}`} />
                          <span className="font-medium text-sm text-ink">{run.model}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          status === 'done' || status === 'completed' ? 'bg-green-50 text-green-600' :
                          status === 'error' || status === 'failed' ? 'bg-red-50 text-red-600' :
                          status === 'retrying' ? 'bg-yellow-50 text-yellow-600' :
                          status === 'streaming' || status === 'running' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {status === 'done' || status === 'completed' ? '已完成' :
                           status === 'error' || status === 'failed' ? '失败' :
                           status === 'retrying' ? '重试中...' :
                           status === 'streaming' || status === 'running' ? '生成中...' : '等待中'}
                        </span>
                      </div>
                      <div className="px-4 py-3 flex-1 overflow-y-auto max-h-[400px] text-sm">
                        {!content && (status === 'queued' || status === 'streaming' || status === 'running') && (
                          <div className="space-y-2">
                            <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                            <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
                            <div className="h-3 w-52 animate-pulse rounded bg-gray-100" />
                          </div>
                        )}
                        {status === 'retrying' && !content && (
                          <div className="flex items-center gap-2 text-yellow-600 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>请求超时，正在自动重试...</span>
                          </div>
                        )}
                        {content && (
                          <div className={status === 'streaming' || status === 'running' ? 'streaming-cursor' : ''}>
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
                          </div>
                        )}
                        {(status === 'error' || status === 'failed') && !content && (
                          <div className="text-center py-4">
                            <div className="text-red-500 text-sm mb-3">生成失败</div>
                            <button
                              onClick={() => retryRun(run.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                              重新生成
                            </button>
                          </div>
                        )}
                      </div>
                      {(status === 'done' || status === 'completed') && content && (
                        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-inkLight">{content.length} 字</span>
                          <button onClick={() => navigator.clipboard.writeText(content)}
                            className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1">
                            <Copy className="w-3 h-3" /> 复制
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeScene && (
            <div className="flex-1 overflow-hidden">
              {activeScene === 'compare' && <CompareScene workspaceId={wsId} onDraftGenerated={handleDraftGenerated} />}
              {activeScene === 'brainstorm' && <BrainstormScene workspaceId={wsId} onDraftGenerated={handleDraftGenerated} />}
              {activeScene === 'compose' && <ComposeScene workspaceId={wsId} onDraftGenerated={handleDraftGenerated} />}
              {activeScene === 'review' && <ReviewScene workspaceId={wsId} onDraftGenerated={handleDraftGenerated} />}
            </div>
          )}

          {activeStep === 'output' && !activeScene && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {draftContent ? (
                <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-8">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{draftContent}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FileText className="w-12 h-12 text-gray-200 mb-3" />
                  <div className="text-sm text-inkLight">暂无最终稿</div>
                  <div className="text-xs text-inkLight/60 mt-1">使用场景工具后，最终稿会显示在这里</div>
                </div>
              )}
            </div>
          )}

          {allDone && completedCount >= 2 && (
            <div className="border-t border-gray-200 bg-white px-6 py-3 shrink-0">
              {recommendation && !activeScene && (
                <div className="mb-3">
                  <button onClick={() => setShowRecommendReason(!showRecommendReason)}
                    className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    建议进入【{SCENE_DEFS.find(s => s.key === recommendation.scene)?.label}】
                    {showRecommendReason ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showRecommendReason && (
                    <div className="mt-1 text-xs text-inkLight bg-gray-50 rounded-lg px-3 py-2">
                      {recommendation.reason}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mb-3 overflow-x-auto">
                {activeScene && (
                  <button onClick={() => { setActiveScene(null); setActiveStep('models') }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-inkLight hover:border-accent transition whitespace-nowrap">
                    <ArrowLeft className="w-3.5 h-3.5" /> AI 回答
                  </button>
                )}
                {SCENE_DEFS.map(btn => (
                  <button key={btn.key} onClick={() => enterScene(btn.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition whitespace-nowrap ${
                      activeScene === btn.key ? 'bg-accent text-white border-accent' :
                      recommendation?.scene === btn.key && !activeScene ? 'bg-accent/10 text-accent border-accent/30' :
                      'bg-white text-ink border-gray-200 hover:border-accent'
                    }`}>
                    {btn.icon}
                    <div className="text-left">
                      <div className="font-medium leading-tight">{btn.label}</div>
                      <div className={`text-[10px] ${activeScene === btn.key ? 'text-white/70' : 'text-inkLight'}`}>{btn.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <MentionTextarea
                      data={runs.map(r => ({ id: r.id, display: r.model }))}
                      value={chatInput}
                      onChange={setChatInput}
                      onSubmit={handleChatSubmit}
                      placeholder="输入指令，如「帮我对比一下价格」「分析各方观点」..."
                      disabled={chatProcessing}
                    />
                </div>
                <button onClick={handleChatSubmit} disabled={chatProcessing || !chatInput.trim()}
                  className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30 hover:bg-accent/85 transition shrink-0">
                  {chatProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== 右栏：最终稿预览 ===== */}
      <aside className="hidden lg:flex w-72 border-l border-gray-200 bg-white/80 backdrop-blur-sm flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink flex items-center gap-1">
              <FileText className="w-4 h-4 text-accent" /> 最终稿
            </span>
            <span className="text-[10px] font-mono text-black/20 tracking-wider">OUTPUT</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {draftContent ? (
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
                }}>{draftContent}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <FileText className="w-10 h-10 text-gray-200 mb-3" />
              <div className="text-sm text-inkLight">暂无最终稿</div>
              <div className="text-xs text-inkLight/60 mt-1">使用下方场景工具后<br/>这里将显示生成结果</div>
            </div>
          )}
        </div>

        {draftContent && (
          <div className="p-3 border-t border-gray-200">
            <button onClick={() => draftContent && navigator.clipboard.writeText(draftContent)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 text-sm text-inkLight hover:bg-gray-50 hover:border-accent transition flex items-center justify-center gap-1">
              <Copy className="w-3.5 h-3.5" /> 复制全文
            </button>
          </div>
        )}
      </aside>

      {/* ===== 抽屉 ===== */}
      {showDrawer && (
        <>
          <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setShowDrawer(null)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
            <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
              <span className="font-semibold text-sm flex items-center gap-2">
                {showDrawer === 'observer'
                  ? <><Eye className="w-4 h-4" /> 旁观者视角</>
                  : <><Zap className="w-4 h-4" /> 灵光一闪</>
                }
              </span>
              <button onClick={() => setShowDrawer(null)} className="text-inkLight hover:text-ink transition text-lg">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(showDrawer === 'observer' && observerLoading) || (showDrawer === 'spark' && sparkLoading) ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
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
              <button onClick={() => {
                const content = showDrawer === 'observer' ? observerContent : sparkContent
                if (content) navigator.clipboard.writeText(content)
              }}
                className="w-full text-sm text-inkLight hover:text-accent py-2 border border-gray-200 rounded-lg transition flex items-center justify-center gap-1">
                <Copy className="w-3.5 h-3.5" /> 复制内容
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}