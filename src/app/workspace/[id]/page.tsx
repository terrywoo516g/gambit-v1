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

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  referencedRunIds: string
  createdAt: string
}

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
  { key: 'compare', label: '多源对比', desc: '生成推荐报告', icon: <LayoutGrid className="w-4 h-4" /> },
  { key: 'brainstorm', label: '头脑风暴', desc: '共识分歧盲点', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'compose', label: '创意合成', desc: '多源整合成稿', icon: <Pencil className="w-4 h-4" /> },
  { key: 'review', label: '多AI审稿', desc: '汇总修改建议', icon: <FileCheck className="w-4 h-4" /> },
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

type StepKey = 'models' | 'scene' | 'output'

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

  // 聊天状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatProcessing, setChatProcessing] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [chatLimitReached, setChatLimitReached] = useState(false)
  
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  // 引用的 AI 卡片
  const [referencedRunIds, setReferencedRunIds] = useState<string[]>([])
  const [showMentionPicker, setShowMentionPicker] = useState(false)

  useEffect(() => {
    if (!wsId) return
    async function load() {
      try {
        const [wsRes, chatRes] = await Promise.all([
          fetch('/api/workspaces/' + wsId),
          fetch('/api/workspaces/' + wsId + '/chat/messages')
        ])
        
        const wsData = await wsRes.json()
        if (!wsRes.ok) throw new Error(wsData.error)
        setWorkspace(wsData.workspace)

        const latest = wsData.workspace.sceneSessions
          ?.flatMap((s: WorkspaceData['sceneSessions'][0]) => s.finalDrafts)
          ?.sort((a: { version: number }, b: { version: number }) => b.version - a.version)[0]
        if (latest) setDraftContent(latest.content)

        const chatData = await chatRes.json()
        if (chatRes.ok) {
          setChatMessages(chatData.messages)
          if (chatData.messages.filter((m: ChatMessage) => m.role === 'user').length >= 4) {
            setChatLimitReached(true)
          }
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [wsId])

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
    if (!input || chatProcessing || chatLimitReached) return
    setChatProcessing(true)
    setStreamingMessage('')

    const newUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: input,
      referencedRunIds: JSON.stringify(referencedRunIds),
      createdAt: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, newUserMsg])
    setChatInput('')

    try {
      const res = await fetch('/api/workspaces/' + wsId + '/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, referencedRunIds }),
      })

      if (!res.ok || !res.body) {
        throw new Error('网络请求失败')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantMsg = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (!dataStr) continue
            try {
              const data = JSON.parse(dataStr)
              if (data.type === 'delta') {
                assistantMsg += data.text
                setStreamingMessage(assistantMsg)
              } else if (data.type === 'done') {
                setChatMessages(prev => [...prev, {
                  id: data.messageId || `temp-assistant-${Date.now()}`,
                  role: 'assistant',
                  content: assistantMsg,
                  referencedRunIds: '[]',
                  createdAt: new Date().toISOString()
                }])
                setStreamingMessage('')
                
                if (chatMessages.filter(m => m.role === 'user').length + 1 >= 4) {
                  setChatLimitReached(true)
                }
              } else if (data.type === 'limit') {
                alert(data.message)
                setChatLimitReached(true)
              } else if (data.type === 'error') {
                console.error('SSE Error:', data.message)
              }
            } catch (e) {
              console.error('Parse JSON error:', e, dataStr)
            }
          }
        }
      }
    } catch {
      alert('处理失败，请重试')
    } finally {
      setChatProcessing(false)
      setTimeout(() => {
        const msgsEnd = document.getElementById('messages-end')
        if (msgsEnd) msgsEnd.scrollIntoView({ behavior: 'smooth' })
      }, 100)
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

  function toggleRef(runId: string) {
    setReferencedRunIds(prev =>
      prev.includes(runId) ? prev.filter(id => id !== runId) : [...prev, runId]
    )
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
  const completedRuns = runs.filter(r => {
    const s = getStatus(r)
    return s === 'done' || s === 'completed'
  })
  const refRunsMap = new Map(runs.map(r => [r.id, r]))

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

        <div className="p-3 border-b border-gray-100 flex-1 overflow-y-auto">
          <div className="text-[10px] font-mono text-black/20 mb-2 tracking-wider px-2">STEPS</div>
          
          <div className="space-y-1">
            {/* 1. AI 回答 */}
            <div>
              <button onClick={() => { setActiveStep('models'); setActiveScene(null) }}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeStep === 'models' ? 'bg-accent/10 text-accent font-medium' : 'text-inkLight hover:bg-gray-50'
                }`}>
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium shrink-0 ${
                  activeStep === 'models' ? 'bg-accent text-white' : 'bg-gray-200 text-inkLight'
                }`}>1</span>
                AI 回答
              </button>
              
              <div className="ml-5 pl-4 border-l-2 border-gray-100 py-1 space-y-1">
                {runs.map(run => {
                  const status = getStatus(run)
                  const isActive = activeRunId === run.id
                  return (
                    <button key={run.id} onClick={() => scrollToRun(run.id)}
                      className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-xs transition ${
                        isActive ? 'text-accent bg-accent/5' : 'text-inkLight hover:text-ink hover:bg-gray-50'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${MODEL_STATUS_COLORS[status] || 'bg-gray-300'}`} />
                      <span className="truncate">{run.model}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. 对话 */}
            <div>
              <button onClick={() => { 
                setActiveStep('models')
                setActiveScene(null)
                setTimeout(() => document.getElementById('messages-end')?.scrollIntoView({ behavior: 'smooth' }), 100)
              }}
                className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeStep === 'models' && chatMessages.length > 0 ? 'text-ink font-medium' : 'text-inkLight hover:bg-gray-50'
                }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium shrink-0 ${
                    activeStep === 'models' && chatMessages.length > 0 ? 'bg-gray-300 text-ink' : 'bg-gray-200 text-inkLight'
                  }`}>2</span>
                  对话
                </div>
                {chatMessages.length > 0 && (
                  <span className="text-[10px] bg-gray-100 text-inkLight px-1.5 py-0.5 rounded">
                    {Math.ceil(chatMessages.length / 2)} 轮
                  </span>
                )}
              </button>
            </div>

            {/* 3. 场景产物 */}
            {workspace.sceneSessions.length > 0 && (
              <div>
                <button onClick={() => { setActiveStep('scene'); if (workspace.sceneSessions[0]) enterScene(workspace.sceneSessions[0].sceneType as SceneKey) }}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    activeStep === 'scene' ? 'bg-accent/10 text-accent font-medium' : 'text-inkLight hover:bg-gray-50'
                  }`}>
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium shrink-0 ${
                    activeStep === 'scene' ? 'bg-accent text-white' : 'bg-gray-200 text-inkLight'
                  }`}>3</span>
                  场景产物
                </button>
                <div className="ml-5 pl-4 border-l-2 border-gray-100 py-1 space-y-1">
                  {workspace.sceneSessions.map(session => {
                    const sceneDef = SCENE_DEFS.find(s => s.key === session.sceneType)
                    if (!sceneDef) return null
                    return (
                      <button key={session.id} onClick={() => enterScene(session.sceneType as SceneKey)}
                        className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-xs transition ${
                          activeScene === session.sceneType ? 'text-accent bg-accent/5' : 'text-inkLight hover:text-ink hover:bg-gray-50'
                        }`}>
                        <div className="w-3.5 h-3.5 shrink-0 opacity-70">{sceneDef.icon}</div>
                        <span className="truncate">{sceneDef.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 4. 最终稿 */}
            <div>
              <button onClick={() => { setActiveStep('output'); setActiveScene(null) }}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeStep === 'output' ? 'bg-accent/10 text-accent font-medium' : 'text-inkLight hover:bg-gray-50'
                }`}>
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium shrink-0 ${
                  activeStep === 'output' ? 'bg-accent text-white' : 'bg-gray-200 text-inkLight'
                }`}>{workspace.sceneSessions.length > 0 ? '4' : '3'}</span>
                最终稿
              </button>
            </div>
          </div>
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
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleRef(run.id)}
                              className={`text-xs transition flex items-center gap-1 ${
                                referencedRunIds.includes(run.id)
                                  ? 'text-accent font-medium'
                                  : 'text-inkLight hover:text-accent'
                              }`}
                            >
                              {referencedRunIds.includes(run.id) ? '✓ 已引用' : '@ 引用'}
                            </button>
                            <button onClick={() => navigator.clipboard.writeText(content)}
                              className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1">
                              <Copy className="w-3 h-3" /> 复制
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 消息列表区域 */}
          {(chatMessages.length > 0 || streamingMessage) && !activeScene && (
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50/30">
              <div className="max-w-3xl mx-auto space-y-6">
                {chatMessages.map((msg, i) => (
                  <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-gray-100 text-ink rounded-tr-sm' 
                        : 'bg-white border border-gray-200 text-ink shadow-sm rounded-tl-sm'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-xs text-accent font-medium">
                          <Zap className="w-3.5 h-3.5" />
                          DeepSeek V3.2
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border border-gray-200 text-ink shadow-sm rounded-tl-sm">
                      <div className="flex items-center gap-1.5 mb-1.5 text-xs text-accent font-medium">
                        <Zap className="w-3.5 h-3.5" />
                        DeepSeek V3.2
                      </div>
                      <div className="prose prose-sm max-w-none streaming-cursor">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingMessage}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
                {chatLimitReached && (
                  <div className="text-center mt-6 mb-2">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-xs text-inkLight">
                      已达 4 轮对话上限
                      <button onClick={() => window.open('/', '_blank')} className="text-accent hover:underline font-medium">
                        开新窗口继续
                      </button>
                    </span>
                  </div>
                )}
                <div id="messages-end" className="h-1" />
              </div>
            </div>
          )}

          {activeScene && (
            <div className="flex-1 overflow-hidden">
              {activeScene === 'compare' && <CompareScene workspaceId={wsId} onDraftGenerated={handleDraftGenerated} referencedRunIds={referencedRunIds} />}
              {activeScene === 'brainstorm' && <BrainstormScene workspaceId={wsId} onDraftGenerated={handleDraftGenerated} referencedRunIds={referencedRunIds} />}
              {activeScene === 'compose' && <ComposeScene workspaceId={wsId} onDraftGenerated={handleDraftGenerated} referencedRunIds={referencedRunIds} />}
              {activeScene === 'review' && <ReviewScene workspaceId={wsId} onDraftGenerated={handleDraftGenerated} referencedRunIds={referencedRunIds} />}
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
                    <div className="flex items-baseline gap-1.5 text-left">
                      <div className="font-medium leading-tight whitespace-nowrap">{btn.label}</div>
                      <div className={`text-[11px] whitespace-nowrap ${activeScene === btn.key ? 'text-white/70' : 'text-inkLight'}`}>{btn.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {referencedRunIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-mono text-black/30 tracking-wider mr-1">REFS:</span>
                  {referencedRunIds.map(rid => {
                    const r = refRunsMap.get(rid)
                    if (!r) return null
                    return (
                      <span key={rid}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs border border-accent/30">
                        @{r.model}
                        <button onClick={() => toggleRef(rid)} className="hover:text-accent/70 transition" aria-label="移除引用">×</button>
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input type="text" value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit() }
                      if (e.key === '@') setShowMentionPicker(true)
                      if (e.key === 'Escape') setShowMentionPicker(false)
                    }}
                    placeholder={chatLimitReached ? "已达 4 轮对话上限，请开启新对话" : "输入指令，输入 @ 可引用指定 AI，回车提交..."}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-accent transition bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    disabled={chatProcessing || chatLimitReached} />
                  <button type="button" onClick={() => setShowMentionPicker(v => !v)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-inkLight hover:text-accent hover:bg-gray-100 transition"
                    title="引用 AI 回答">
                    <span className="text-sm font-semibold">@</span>
                  </button>

                  {showMentionPicker && completedRuns.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMentionPicker(false)} />
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-100 text-[10px] font-mono text-black/30 tracking-wider">
                          选择要引用的 AI 回答
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {completedRuns.map(r => {
                            const selected = referencedRunIds.includes(r.id)
                            return (
                              <button key={r.id}
                                onClick={() => {
                                  toggleRef(r.id)
                                  if (chatInput.endsWith('@')) setChatInput(chatInput.slice(0, -1))
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition ${
                                  selected ? 'bg-accent/5 text-accent' : 'text-ink hover:bg-gray-50'
                                }`}>
                                <span className="truncate">{r.model}</span>
                                {selected && <span className="text-accent">✓</span>}
                              </button>
                            )
                          })}
                        </div>
                        <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] text-inkLight">已选 {referencedRunIds.length} 个</span>
                          <button onClick={() => setShowMentionPicker(false)} className="text-xs text-accent hover:text-accent/70 transition">完成</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button onClick={handleChatSubmit} disabled={chatProcessing || !chatInput.trim()}
                  className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30 hover:bg-accent/85 transition shrink-0">
                  {chatProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
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