'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMultiStream, StreamState } from '@/hooks/useMultiStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { 
  ArrowLeft, Eye, Copy, Send, Loader2,
  FileText, Pin, RefreshCw, Maximize2, Minimize2,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react'

import ChatTurnCard from '@/components/workspace/ChatTurnCard'
import FinalDraftPanel from '@/components/workspace/FinalDraftPanel'
import { Reflection } from '@/lib/reflection/types'
import UserMenu from '@/components/auth/UserMenu'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  referencedRunIds: string
  createdAt: string
  modelName?: string // 扩展展示字段，可能前端组装时没有保存进 DB，但在内存中需要
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
  reflectionData?: string | null
  reflectionAt?: string | null
}

// Scene definitions removed as requested

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

type StepKey = 'models' | 'output'


const AICard = React.memo(function AICard({ run, status, content, activeRunId, referencedRunIds, retryRun, toggleRef, isMaximized, onToggleMaximize }: any) {
  const totalLength = content ? content.length : 0

  return (
    <div id={isMaximized ? 'run-max-' + run.id : 'run-' + run.id}
      className={`bg-white border rounded-2xl flex flex-col shadow-sm transition ${
        isMaximized ? 'h-full shadow-2xl ring-1 ring-black/5 border-none' : (activeRunId === run.id ? 'border-accent ring-1 ring-accent/20 h-[360px]' : 'border-gray-200 h-[360px]')
      }`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${MODEL_STATUS_COLORS[status] || 'bg-gray-300'}`} />
          <span className="font-medium text-sm text-ink">{run.model}</span>
        </div>
        <div className="flex items-center gap-2">
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
          {(status === 'done' || status === 'completed') && (
            <button 
              onClick={onToggleMaximize}
              className="text-gray-400 hover:text-ink transition p-0.5 rounded hover:bg-gray-100"
              title={isMaximized ? "恢复" : "全屏放大"}
            >
              {isMaximized ? <Minimize2 className="w-[14px] h-[14px]" /> : <Maximize2 className="w-[14px] h-[14px]" />}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex-1 text-sm flex flex-col overflow-hidden">
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
          <>
            <div className={`overflow-y-auto ${status === 'streaming' || status === 'running' ? 'streaming-cursor' : ''}`} style={isMaximized ? { height: '100%' } : { height: '100%' }}>
              {status === 'streaming' || status === 'running' ? (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {content}
                  <span className="animate-pulse">▍</span>
                </div>
              ) : (
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
            </div>
          </>
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
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-inkLight">{totalLength} 字</span>
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
          <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'card', sourceId: run.id, sourceLabel: run.model, content } }))}
            className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1">
            <Pin className="w-3 h-3" /> 加入最终稿
          </button>
        </div>
        </div>
      )}
    </div>
  )
})

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)

  // 初始化折叠状态
  useEffect(() => {
    const cached = localStorage.getItem('gambit:leftSidebarCollapsed')
    if (cached === 'true') {
      setIsLeftCollapsed(true)
    }
  }, [])

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)

  const [observerObservations, setObserverObservations] = useState<string[]>([])
  const [observerLoading, setObserverLoading] = useState(false)
  const [showDrawer, setShowDrawer] = useState<'observer' | null>(null)

  const [activeStep, setActiveStep] = useState<StepKey>('models')
  
  const [recommendation, setRecommendation] = useState<{scene: string, reason: string} | null>(null)
  const [draftContent, setDraftContent] = useState<string | null>(null)

  // Reflection 状态
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [reflectionStatus, setReflectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [reflectionError, setReflectionError] = useState<string | null>(null)

  // 聊天状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatProcessing, setChatProcessing] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [chatLimitReached, setChatLimitReached] = useState(false)
  
  const [maximizedRunId, setMaximizedRunId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)


  // 引用的 AI 卡片
  const [referencedRunIds, setReferencedRunIds] = useState<string[]>([])
  const [showMentionPicker, setShowMentionPicker] = useState(false)

  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set())

  const runsToStream = workspace?.modelRuns
    ?.filter(r => r.status === 'queued' || r.status === 'running')
    ?.map(r => ({ id: r.id, model: r.model })) ?? []

  const { streams, allDone, completedCount, total } = useMultiStream(
    runsToStream.length > 0 ? wsId : null,
    runsToStream
  )

  const triggerReflection = useCallback(async () => {
    if (!wsId) return
    setReflectionStatus('loading')
    setReflectionError(null)
    try {
      const res = await fetch(`/api/workspaces/${wsId}/reflection`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        const errMap: Record<string, string> = {
          'INSUFFICIENT_RESPONSES': '回答数量不足',
          'PARSE_ERROR': '分析格式异常',
          'SERVER_ERROR': '生成失败',
          'WORKSPACE_NOT_FOUND': '工作区不存在',
          'INVALID_WORKSPACE_ID': '无效工作区 ID',
        }
        throw new Error(errMap[data.error] || '生成失败')
      }
      if (data.reflection) {
        setReflection(data.reflection)
        setReflectionStatus('success')
      } else {
        throw new Error('分析格式异常')
      }
    } catch (err: any) {
      setReflectionError(err.message || '生成失败')
      setReflectionStatus('error')
    }
  }, [wsId])

  const hasTriggeredReflectionRef = useRef(false)

  const expectedRunCount = workspace?.modelRuns?.length ?? 0
  const terminalStatuses = new Set(['done', 'completed', 'error', 'failed', 'cancelled'])
  const activeStatuses = new Set(['idle', 'queued', 'running', 'streaming'])
  
  const trackedRuns = workspace?.modelRuns?.map(r => ({
    id: r.id,
    status: getStatus(r),
    content: getContent(r)
  })) ?? []
  
  const hasActiveRun = trackedRuns.some(run => activeStatuses.has(run.status))
  const terminalRunCount = trackedRuns.filter(run => terminalStatuses.has(run.status)).length
  const validAnswerCount = trackedRuns.filter(run => 
    terminalStatuses.has(run.status) && 
    typeof run.content === 'string' && 
    run.content.trim().length > 0
  ).length

  const isMockReflection = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mockReflection") === "1"

  useEffect(() => {
    if (!workspace) return
    if (isMockReflection) return
    if (!workspace.reflectionData) return
    
    try {
      const parsed = JSON.parse(workspace.reflectionData)
      setReflection(parsed)
      setReflectionStatus('success')
      hasTriggeredReflectionRef.current = true
    } catch (e) {
      console.error('[reflection] failed to parse saved reflectionData', e)
      setReflection(null)
      setReflectionStatus('idle')
      hasTriggeredReflectionRef.current = false
    }
  }, [workspace?.id, workspace?.reflectionData, isMockReflection])

  const hasSavedReflection = Boolean(workspace?.reflectionData && workspace?.reflectionAt)

  const canTriggerReflection =
    !isMockReflection &&
    !hasSavedReflection &&
    reflectionStatus !== 'success' &&
    allDone &&
    expectedRunCount > 0 &&
    trackedRuns.length >= expectedRunCount &&
    terminalRunCount >= expectedRunCount &&
    validAnswerCount >= 2 &&
    !hasActiveRun

  useEffect(() => {
    if (canTriggerReflection && !hasTriggeredReflectionRef.current) {
      hasTriggeredReflectionRef.current = true
      triggerReflection()
    }
  }, [canTriggerReflection, triggerReflection])
  useEffect(() => {
    hasTriggeredReflectionRef.current = false
  }, [wsId])

  const trackedAllDone = useRef(false)
  useEffect(() => {
    if (allDone && completedCount > 0 && !trackedAllDone.current) {
      trackedAllDone.current = true
      import('@/lib/track').then(({ track }) => {
        track('ai_all_done', { workspaceId: wsId, durationMs: 0 }) // TODO: Calculate real duration
      }).catch(console.error)
    }
  }, [allDone, completedCount, wsId])

  useEffect(() => {
    if (allDone && !recommendation && wsId && completedCount > 0) {
      fetch(`/api/workspaces/${wsId}/recommend-scene`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data && data.scene) {
            setRecommendation(data)
          }
        })
        .catch(console.error)
    }
  }, [allDone, wsId, recommendation, completedCount])


  useEffect(() => {
    if (!wsId) return
    async function load() {
      try {
        const [wsRes, chatRes] = await Promise.all([
          fetch('/api/workspaces/' + wsId),
          fetch('/api/workspaces/' + wsId + '/chat/messages')
        ])
        
        const wsData = await wsRes.json()
        if (wsRes.ok) {
        setWorkspace(wsData.workspace)
      }

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

  function getContent(run: { id: string; content: string }): string {
    if (streams[run.id]?.content) return streams[run.id].content
    return run.content
  }

  function getStatus(run: { id: string; status: string }): string {
    const stream = streams[run.id] as StreamState | undefined
    if (stream) return stream.status
    return run.status
  }

  async function handleObserver(forceReload = false) {
    if (showDrawer === 'observer' && !forceReload) {
      setShowDrawer(null)
      return
    }

    setShowDrawer('observer')
    
    // 如果已经有数据且不是强制重载，则直接显示缓存
    if (observerObservations.length > 0 && !forceReload) return

    try {
      setObserverLoading(true)
      const res = await fetch('/api/workspaces/' + wsId + '/observer', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setObserverObservations(data.text ? data.text.split(/\n\n+/).filter((p: string) => p.trim()) : [])
    } catch (e) {
      alert(e instanceof Error ? e.message : '旁观者调用失败')
    } finally {
      setObserverLoading(false)
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
      setActiveStep('models')
      
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
        const lines = chunk.split('\n')
        
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
  const refChatMap = new Map(chatMessages.filter(m => m.role === 'assistant').map(m => [m.id, m]))

  // 计算对话轮次
  const userMessages = chatMessages.filter(m => m.role === 'user')
  const latestRoundIndex = userMessages.length
  const chatRounds = userMessages.map((userMsg, index) => {
    const roundIndex = index + 1
    const assistantMsg = chatMessages.find(m => m.role === 'assistant' && m.createdAt > userMsg.createdAt && 
      (index === userMessages.length - 1 || m.createdAt < userMessages[index + 1].createdAt))
    return { roundIndex, userMsg, assistantMsg }
  })

  // ========== JSX 部分在任务 8B 中补充 ==========
  const toggleLeftSidebar = () => {
    const newVal = !isLeftCollapsed
    setIsLeftCollapsed(newVal)
    localStorage.setItem('gambit:leftSidebarCollapsed', String(newVal))
  }

  return (
    <main className="flex h-screen bg-[radial-gradient(circle,_rgba(0,0,0,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] text-ink">
      {/* ===== 左栏：导航 ===== */}
      <aside className={`hidden md:flex border-r border-gray-200 bg-white/80 backdrop-blur-sm flex-col shrink-0 z-20 transition-all duration-200 ease-in-out ${isLeftCollapsed ? 'w-[60px]' : 'w-[200px]'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => router.push('/')}
              title={isLeftCollapsed ? "返回首页" : undefined}
              className={`text-xs text-inkLight hover:text-accent flex items-center transition ${isLeftCollapsed ? 'justify-center w-full' : 'gap-1'}`}>
              <ArrowLeft className="w-4 h-4 shrink-0" /> {!isLeftCollapsed && <span>返回首页</span>}
            </button>
            <button onClick={toggleLeftSidebar}
              className={`text-inkLight hover:text-accent transition ${isLeftCollapsed ? 'hidden' : 'block'}`}>
              <PanelLeftClose className="w-4 h-4" />
            </button>
            {isLeftCollapsed && (
              <button onClick={toggleLeftSidebar}
                className="absolute top-12 left-0 right-0 mx-auto w-8 flex justify-center text-inkLight hover:text-accent transition">
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
          </div>
          {!isLeftCollapsed && (
            <>
              <div className="text-sm font-semibold text-ink truncate">{workspace.title}</div>
              <div className="text-[10px] font-mono text-black/20 mt-1 tracking-wider">GAMBIT WORKSPACE</div>
            </>
          )}
        </div>

        <div className="p-3 border-b border-gray-100 flex-1 overflow-y-auto">
          {!isLeftCollapsed && <div className="text-[10px] font-mono text-black/20 mb-2 tracking-wider px-2">STEPS</div>}
          
          <div className="space-y-1">
            {/* 1. AI 回答 */}
            <div>
              <button onClick={() => { setActiveStep('models') }}
                title={isLeftCollapsed ? "AI 回答" : undefined}
                className={`flex items-center w-full text-left py-2 rounded-lg text-sm transition ${
                  activeStep === 'models' ? 'bg-accent/10 text-accent font-medium' : 'text-inkLight hover:bg-gray-50'
                } ${isLeftCollapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}>
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium shrink-0 ${
                  activeStep === 'models' ? 'bg-accent text-white' : 'bg-gray-200 text-inkLight'
                }`}>1</span>
                {!isLeftCollapsed && <span>AI 回答</span>}
              </button>
              
              {!isLeftCollapsed && (
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
              )}
            </div>

            {/* 2. 对话 */}
            <div>
              <button onClick={() => { 
                setActiveStep('models')
                setTimeout(() => document.getElementById('messages-end')?.scrollIntoView({ behavior: 'smooth' }), 100)
              }}
                title={isLeftCollapsed ? "对话" : undefined}
                className={`flex items-center w-full text-left py-2 rounded-lg text-sm transition ${
                  activeStep === 'models' && chatMessages.length > 0 ? 'text-ink font-medium' : 'text-inkLight hover:bg-gray-50'
                } ${isLeftCollapsed ? 'justify-center px-0' : 'justify-between px-3'}`}>
                <div className={`flex items-center ${isLeftCollapsed ? 'justify-center' : 'gap-2'}`}>
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium shrink-0 ${
                    activeStep === 'models' && chatMessages.length > 0 ? 'bg-gray-300 text-ink' : 'bg-gray-200 text-inkLight'
                  }`}>2</span>
                  {!isLeftCollapsed && <span>对话</span>}
                </div>
                {!isLeftCollapsed && chatMessages.length > 0 && (
                  <span className="text-[10px] bg-gray-100 text-inkLight px-1.5 py-0.5 rounded">
                    {Math.ceil(chatMessages.length / 2)} 轮
                  </span>
                )}
              </button>
            </div>

            {/* 3. 最终稿 */}
            <div>
              <button onClick={() => { setActiveStep('output') }}
                title={isLeftCollapsed ? "最终稿" : undefined}
                className={`flex items-center w-full text-left py-2 rounded-lg text-sm transition ${
                  activeStep === 'output' ? 'bg-accent/10 text-accent font-medium' : 'text-inkLight hover:bg-gray-50'
                } ${isLeftCollapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}>
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium shrink-0 ${
                  activeStep === 'output' ? 'bg-accent text-white' : 'bg-gray-200 text-inkLight'
                }`}>3</span>
                {!isLeftCollapsed && <span>最终稿</span>}
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 relative">
          <button 
            onClick={() => handleObserver(false)} 
            disabled={completedRuns.length === 0}
            title={completedRuns.length === 0 ? "请等待 AI 回答完成后查看" : (isLeftCollapsed ? "旁观者视角" : undefined)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition shadow-sm ${
              showDrawer === 'observer' 
                ? 'border-accent bg-accent/5 text-accent font-medium' 
                : 'border-gray-200 bg-white text-ink hover:border-accent hover:text-accent disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-ink'
            }`}>
            <Eye className="w-4 h-4 shrink-0" />
            {!isLeftCollapsed && (
              <>
                旁观者视角
                {showDrawer === 'observer' ? <span className="ml-1 text-[10px]">▲</span> : <span className="ml-1 text-[10px]">▼</span>}
              </>
            )}
          </button>
          
          {/* ===== 抽屉 ===== */}
          {showDrawer === 'observer' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDrawer(null)} />
              <div className="absolute bottom-[calc(100%+8px)] left-3 w-[450px] max-h-[60vh] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden origin-bottom-left animate-in fade-in zoom-in-95 duration-200">
                <div className="h-12 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between px-4 shrink-0">
                  <span className="font-semibold text-sm flex items-center gap-2 text-ink">
                    <Eye className="w-4 h-4" /> 旁观者视角
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleObserver(true)} disabled={observerLoading} className="p-1.5 text-inkLight hover:text-accent transition rounded-lg hover:bg-gray-100 disabled:opacity-50" title="重新生成">
                      <RefreshCw className={`w-4 h-4 ${observerLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setShowDrawer(null)} className="p-1.5 text-inkLight hover:text-ink transition rounded-lg hover:bg-gray-100" title="关闭">
                      &times;
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                  {observerLoading ? (
                    <div className="space-y-4">
                      <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                      <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                      <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {observerObservations.map((obs, i) => (
                        <div key={i}>
                          <div className="text-sm text-ink/80 leading-relaxed py-1 whitespace-pre-wrap">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                              p: ({children}) => <p className="my-1 leading-relaxed">{children}</p>,
                              strong: ({children}) => <strong className="font-semibold text-ink">{children}</strong>,
                            }}>{obs}</ReactMarkdown>
                          </div>
                          {i < observerObservations.length - 1 && <div className="h-px bg-gray-100 my-2" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!observerLoading && observerObservations.length > 0 && (
                  <div className="border-t border-gray-100 p-3 shrink-0 bg-gray-50/50">
                    <button onClick={() => {
                      const text = observerObservations.join('\n')
                      navigator.clipboard.writeText(text)
                      // ideally a toast here, but alert is fine as per spec simple copy logic, wait spec didn't mention toast, just "toast 已复制"
                      // Since we don't have toast in this file easily without import, we'll just alert or if we imported sonner we could use it.
                      // Let's use alert or custom toast. The project has '@/components/Toast', but we can just use native alert if toast is not imported.
                      alert('已复制到剪贴板')
                    }}
                      className="w-full text-sm text-ink hover:text-accent py-2 bg-white border border-gray-200 rounded-lg hover:border-accent transition flex items-center justify-center gap-1.5 shadow-sm font-medium">
                      <Copy className="w-3.5 h-3.5" /> 复制全部
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ===== 中栏 ===== */}
      <section className="flex min-w-0 flex-1 flex-col relative">
        <div className="absolute top-4 right-4 z-50">
          <UserMenu />
        </div>
        <div className="h-11 shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/mascot.png" alt="Mascot" className="w-6 h-6 object-contain" />
              <span className="font-bold text-sm text-ink">国王的检阅台</span>
            </div>
            {!allDone && (
              <span className="text-xs text-inkLight bg-yellow-50 px-2 py-0.5 rounded-full ml-2">
                {completedCount}/{total} 已完成
              </span>
            )}
            {allDone && completedCount >= 2 && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full ml-2">全部完成</span>
            )}
          </div>
          <span className="text-[10px] font-mono text-black/20 tracking-wider">
            REVIEW DESK
          </span>
        </div>

        <div className="px-6 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-start gap-3">
          <div className="text-[10px] font-mono text-black/20 mt-1 shrink-0">QUERY</div>
          <div className="text-sm text-ink leading-relaxed">{workspace.prompt}</div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeStep === 'models' && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4">
                <div className={`grid gap-4 ${runs.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {runs.map(run => {
                    const content = getContent(run)
                    const status = getStatus(run)
                    return (
                      <AICard key={run.id} run={run} status={status} content={content} activeRunId={activeRunId} referencedRunIds={referencedRunIds} retryRun={retryRun} toggleRef={toggleRef} onToggleMaximize={() => setMaximizedRunId(run.id)} />
                    )
                  })}
                </div>
              </div>

              {/* 对话历史区域（按轮次分组） */}
              {chatRounds.length > 0 && (
                <div className="max-w-3xl mx-auto space-y-4 mt-6 pb-6">
                  {chatRounds.map((round) => {
                    const isLatest = round.roundIndex === latestRoundIndex
                    const isExpanded = expandedRounds.has(round.roundIndex) || isLatest

                    if (!isExpanded) {
                      // 折叠状态单行 summary
                      return (
                        <div key={round.userMsg.id} className="flex justify-center">
                          <button onClick={() => {
                            const newSet = new Set(expandedRounds)
                            newSet.add(round.roundIndex)
                            setExpandedRounds(newSet)
                          }} className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition text-inkLight">
                            <span className="truncate">第 {round.roundIndex} 轮：{round.userMsg.content.substring(0, 40)}{round.userMsg.content.length > 40 ? '...' : ''}</span>
                            <span className="text-[10px]">▼</span>
                          </button>
                        </div>
                      )
                    }

                    // 展开状态
                    return (
                      <div key={round.userMsg.id} className="space-y-4">
                        {/* User Msg */}
                        <div className="flex justify-end">
                          <div className="max-w-[70%] bg-gray-100 text-ink px-4 py-3 rounded-2xl rounded-tr-sm text-sm">
                            {round.userMsg.content}
                          </div>
                        </div>
                        {/* Assistant Msg */}
                        {round.assistantMsg && (
                          <div className="flex justify-start">
                            <ChatTurnCard
                              content={round.assistantMsg.content}
                              roundIndex={round.roundIndex}
                              status="completed"
                              isReferenced={referencedRunIds.includes(round.assistantMsg.id)}
                              onToggleRef={() => toggleRef(round.assistantMsg!.id)}
                              onCopy={() => navigator.clipboard.writeText(round.assistantMsg!.content)}
                              onPin={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'chat', sourceId: round.assistantMsg!.id, sourceLabel: `第${round.roundIndex}轮追问`, content: round.assistantMsg!.content } }))}
                            />
                          </div>
                        )}
                        {/* Streaming Msg for the latest round */}
                        {isLatest && !round.assistantMsg && streamingMessage && (
                          <div className="flex justify-start">
                            <ChatTurnCard
                              content={streamingMessage}
                              roundIndex={round.roundIndex}
                              status="streaming"
                              isReferenced={false}
                              onToggleRef={() => {}}
                              onCopy={() => {}}
                              onPin={() => {}}
                            />
                          </div>
                        )}
                        
                        {!isLatest && (
                          <div className="flex justify-end">
                            <button onClick={() => {
                              const newSet = new Set(expandedRounds)
                              newSet.delete(round.roundIndex)
                              setExpandedRounds(newSet)
                            }} className="text-[10px] text-inkLight hover:text-ink">收起第 {round.roundIndex} 轮 ▲</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div id="messages-end" className="h-1" />
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
            </div>
          )}

          {/* activeScene logic removed */}

          {activeStep === 'output' && (
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
              {referencedRunIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-mono text-black/30 tracking-wider mr-1">REFS:</span>
                  {referencedRunIds.map(rid => {
                    const r = refRunsMap.get(rid)
                    const m = refChatMap.get(rid)
                    if (!r && !m) return null
                    
                    let label = ''
                    if (r) {
                      label = `${r.model}`
                    } else if (m) {
                      // find round index
                      const idx = chatMessages.findIndex(msg => msg.id === m.id)
                      const roundIndex = chatMessages.slice(0, idx).filter(msg => msg.role === 'user').length + 1
                      label = `对话 ${roundIndex}`
                    }

                    return (
                      <span key={rid}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs border border-accent/30">
                        @{label}的回答
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
                    placeholder={chatLimitReached ? "已达 4 轮对话上限，请开启新对话" : "输入指令，输入 @ 可引用指定 AI 回答，回车提交..."}
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
                          {chatMessages.map((msg, i) => {
                            if (msg.role !== 'assistant') return null
                            const roundIndex = chatMessages.slice(0, i).filter(m => m.role === 'user').length + 1
                            const selected = referencedRunIds.includes(msg.id)
                            return (
                              <button key={msg.id}
                                onClick={() => {
                                  toggleRef(msg.id)
                                  if (chatInput.endsWith('@')) setChatInput(chatInput.slice(0, -1))
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition ${
                                  selected ? 'bg-accent/5 text-accent' : 'text-ink hover:bg-gray-50'
                                }`}>
                                <span className="truncate">对话 {roundIndex}</span>
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
      
        {maximizedRunId && runs.find(r => r.id === maximizedRunId) && (() => {
          const run = runs.find(r => r.id === maximizedRunId)!
          const content = getContent(run)
          const status = getStatus(run)
          return (
            <div className="absolute inset-0 z-50 bg-gray-50/90 backdrop-blur-sm p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <AICard 
                key={`max-${run.id}`} 
                run={run} 
                status={status} 
                content={content} 
                activeRunId={activeRunId} 
                referencedRunIds={referencedRunIds} 
                retryRun={retryRun} 
                toggleRef={toggleRef} 
                isMaximized={true}
                onToggleMaximize={() => setMaximizedRunId(null)}
              />
            </div>
          )
        })()}
      </section>

      {/* ===== 右栏：最终稿预览 ===== */}
      <aside id="right-panel-container" className="hidden lg:flex w-[400px] border-l border-gray-200 bg-white flex-col relative z-10 shrink-0 shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.05)]">
        <FinalDraftPanel 
          workspaceId={wsId} 
          allDone={allDone} 
          reflection={reflection}
          reflectionStatus={reflectionStatus}
          reflectionError={reflectionError}
          onRetryReflection={triggerReflection}
        />
      </aside>

      {/* ===== 抽屉 (原版已移除) ===== */}
    </main>
  )
}