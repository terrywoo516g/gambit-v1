'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MentionInput } from '@/components/MentionInput'
import { MessageBubble } from '@/components/MessageBubble'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type MessageStatus = 'pending' | 'streaming' | 'done' | 'failed'
type WsMessage = { id: string; role: 'user' | 'ai'; modelId?: string | null; content: string; status: MessageStatus }
type WsArtifact = { id: string; type: string; content: string; version: number; createdAt?: string }
type Round = { userMsg: WsMessage; aiMsgs: WsMessage[] }

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const workspaceId = params.id
  const [messages, setMessages] = useState<WsMessage[]>([])
  const [artifacts, setArtifacts] = useState<WsArtifact[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [workspaceTitle, setWorkspaceTitle] = useState('')
  const [prefillKey, setPrefillKey] = useState(0)
  const [prefillText, setPrefillText] = useState('')
  const [prefillTokens, setPrefillTokens] = useState<
    { type: 'model' | 'tool'; value: string }[] | undefined
  >()
  const [activeAiId, setActiveAiId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    let active = true
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspace/${workspaceId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? '加载失败')
        if (active) {
          setMessages(data.workspace.messages)
          setArtifacts(data.workspace.artifacts ?? [])
          setWorkspaceTitle(data.workspace.title)
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : '加载失败')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [workspaceId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const refreshArtifacts = useCallback(async () => {
    if (!workspaceId) return
    const res = await fetch(`/api/workspace/${workspaceId}`)
    const data = await res.json()
    setArtifacts(data.workspace.artifacts ?? [])
  }, [workspaceId])

  const rounds = useMemo<Round[]>(() => {
    const result: Round[] = []
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') {
        const aiMsgs: WsMessage[] = []
        let j = i + 1
        while (j < messages.length && messages[j].role === 'ai') {
          aiMsgs.push(messages[j]); j++
        }
        result.push({ userMsg: messages[i], aiMsgs })
      }
    }
    return result
  }, [messages])

  const latestArtifact = useMemo(() => {
    if (!artifacts.length) return null
    return [...artifacts].sort((a, b) => {
      if (a.createdAt && b.createdAt)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return b.version - a.version
    })[0]
  }, [artifacts])

  const artifactTitle = useMemo(() => {
    if (!latestArtifact) return '最终稿'
    if (latestArtifact.type === 'synthesis') return '综合建议'
    if (latestArtifact.type === 'review_report') return '审稿报告'
    if (latestArtifact.type === 'compare_table') return '对比分析'
    return '最终稿'
  }, [latestArtifact])

  async function handleRetry(messageId: string) {
    await fetch(`/api/message/${messageId}/retry`, { method: 'POST' })
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId ? { ...m, status: 'pending' as const, content: '' } : m
      )
    )
  }

  function scrollToMessage(msgId: string) {
    setActiveAiId(msgId)
    document.getElementById(`msg-${msgId}`)?.scrollIntoView({
      behavior: 'smooth', block: 'center',
    })
  }

  async function handleSubmit(payload: {
    text: string
    mentions: { models: string[]; tool: string | null }
  }) {
    if (payload.mentions.tool) {
      const normalizedToolName = payload.mentions.tool.replace('@', '')
      const toolMap: Record<string, 'diverge' | 'synthesize' | 'review' | 'compare'> = {
        分歧官: 'diverge', 合成官: 'synthesize', 审稿官: 'review', 比稿官: 'compare',
      }
      const tool = toolMap[normalizedToolName]
      if (!tool) { alert('该功能即将上线：' + payload.mentions.tool); return }
      try {
        setSending(true)
        const res = await fetch('/api/tool/invoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, tool, question: payload.text }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? '工具调用失败')
        const modelIds: Record<string, string[]> = {
          diverge: ['分歧官-激进', '分歧官-稳健', '分歧官-务实'],
          synthesize: ['合成官'],
          review: ['审稿官-逻辑', '审稿官-文字'],
          compare: ['比稿官'],
        }
        const newMsgs: WsMessage[] = [
          { id: data.userMessageId, role: 'user', content: payload.text, status: 'done' },
        ]
        data.messageIds.forEach((mid: string, idx: number) => {
          newMsgs.push({
            id: mid, role: 'ai', modelId: modelIds[tool][idx],
            content: '', status: 'pending',
          })
        })
        setMessages(prev => [...prev, ...newMsgs])
      } catch (err) {
        alert(err instanceof Error ? err.message : '工具调用失败')
      } finally { setSending(false) }
      return
    }

    try {
      setSending(true)
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId, text: payload.text, mentions: payload.mentions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '发送失败')
      setMessages(prev => [
        ...prev,
        { id: data.userMessageId, role: 'user', content: payload.text, status: 'done' },
        ...data.messageIds.map((mid: string, idx: number) => ({
          id: mid, role: 'ai' as const,
          modelId: payload.mentions.models[idx],
          content: '', status: 'pending' as const,
        })),
      ])
    } catch (err) {
      alert(err instanceof Error ? err.message : '发送失败')
    } finally { setSending(false) }
  }

  return (
    <main className="flex h-screen bg-paper blueprint-grid text-ink">
      {/* 左栏：导航 */}
      <aside className="hidden md:flex w-56 border-r border-black/10 bg-paper/50 backdrop-blur-sm flex-col overflow-hidden">
        <div className="p-4 border-b border-black/5">
          <button onClick={() => router.push('/')} className="text-[10px] text-ink-light hover:text-ink flex items-center gap-1 mb-2 font-mono uppercase tracking-wider">← 首页</button>
          <div className="text-sm font-semibold text-ink truncate">{workspaceTitle || '工作台'}</div>
          <div className="blueprint-label-horizontal mt-1">Navigation</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {rounds.map((round, idx) => (
            <div key={round.userMsg.id}>
              <button onClick={() => scrollToMessage(round.userMsg.id)} className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-ink-light hover:bg-black/5 truncate transition">
                <span className="font-mono text-[10px] text-ink-light/50 mr-1">#{idx + 1}</span>
                {round.userMsg.content.slice(0, 24)}{round.userMsg.content.length > 24 ? '…' : ''}
              </button>
              <div className="ml-3 mt-1 space-y-0.5">
                {round.aiMsgs.map(ai => (
                  <button key={ai.id} onClick={() => scrollToMessage(ai.id)}
                    className={`w-full text-left px-2 py-1 rounded-md text-xs flex items-center gap-1.5 transition ${activeAiId === ai.id ? 'bg-accent-light text-accent' : 'text-ink-light hover:bg-black/5'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ai.status === 'done' ? 'bg-green-400' : ai.status === 'streaming' || ai.status === 'pending' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="truncate">{ai.modelId ?? 'AI'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {rounds.length === 0 && !loading && <div className="text-[10px] text-ink-light/50 px-2 py-4 font-mono">等待对话开始...</div>}
        </div>
        <div className="p-3 border-t border-black/5">
          <button onClick={() => router.push('/workspaces')} className="w-full text-[10px] font-mono uppercase tracking-wider text-ink-light hover:text-ink py-2 transition">历史对话</button>
        </div>
      </aside>

      {/* 中栏：审阅台 */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="h-11 shrink-0 border-b border-black/5 bg-paper/80 backdrop-blur-sm px-6 flex items-center">
          <span className="blueprint-label-horizontal">REVIEW PANEL</span>
          <span className="mx-3 text-black/10">|</span>
          <span className="text-xs text-ink-light truncate">{workspaceTitle}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {[1, 2].map(i => (<div key={i} className="rounded-xl border border-black/5 bg-white p-4"><div className="h-3 w-20 bg-gray-200 rounded mb-3"/><div className="space-y-2"><div className="h-3 w-full bg-gray-100 rounded"/><div className="h-3 w-3/4 bg-gray-100 rounded"/></div></div>))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center h-full">
              <div className="text-center">
                <img src="/mascot.png" className="w-20 mx-auto opacity-60" alt="mascot"/>
                <p className="text-sm text-ink-light mt-4">开始一次多 AI 协作</p>
                <p className="text-xs text-ink-light/50 mt-1">在下方输入问题，选择模型或工具开始</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map(msg => (
                <div key={msg.id} id={`msg-${msg.id}`}>
                  <MessageBubble id={msg.id} role={msg.role} modelId={msg.modelId}
                    initialContent={msg.content} status={msg.status} isActive={activeAiId === msg.id}
                    onRetry={handleRetry}
                    onFollowUp={(modelId, quote) => {
                      setPrefillText(`> ${quote}\n\n`)
                      setPrefillTokens([{ type: 'model', value: modelId }])
                      setPrefillKey(prev => prev + 1)
                    }}
                    onStreamDone={() => {
                      setMessages(prev => prev.map(m =>
                        m.id === msg.id ? { ...m, status: 'done' as const } : m
                      ))
                      if (msg.modelId === '合成官' || msg.modelId?.startsWith('审稿官-') || msg.modelId === '比稿官') {
                        void refreshArtifacts()
                      }
                    }}
                  />
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
        <div className="border-t border-black/5 bg-paper/80 backdrop-blur-sm px-6 py-3">
          <MentionInput onSubmit={handleSubmit} disabled={sending} prefillText={prefillText} prefillTokens={prefillTokens} prefillKey={prefillKey} />
        </div>
      </section>

      {/* 右栏：最终稿 */}
      <aside className="hidden lg:flex w-72 border-l border-black/10 bg-paper/50 backdrop-blur-sm flex-col overflow-hidden">
        <div className="p-4 border-b border-black/5">
          <div className="blueprint-label-horizontal mb-1">OUTPUT</div>
          <div className="text-sm font-semibold text-ink">{artifactTitle}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {latestArtifact ? (
            <div className="rounded-xl border border-black/5 bg-white p-4 text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                h1: ({children}) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                h2: ({children}) => <h2 className="text-base font-bold my-2">{children}</h2>,
                h3: ({children}) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                p: ({children}) => <p className="my-1 text-sm leading-relaxed">{children}</p>,
                ul: ({children}) => <ul className="list-disc pl-4 my-1 text-sm">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal pl-4 my-1 text-sm">{children}</ol>,
                li: ({children}) => <li className="leading-relaxed">{children}</li>,
                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                code: ({children}) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                pre: ({children}) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto my-2">{children}</pre>,
              }}>{latestArtifact.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-xs text-ink-light/50 font-mono py-8 text-center">
              使用合成/审稿/比稿工具后<br/>最终稿将在此显示
            </div>
          )}
        </div>
        {latestArtifact && (
          <div className="p-4 border-t border-black/5">
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(latestArtifact.content) } catch {}
              }}
              className="w-full py-2 rounded-lg border border-black/10 text-xs font-medium text-ink-light hover:bg-white transition"
            >
              复制全文
            </button>
          </div>
        )}
      </aside>
    </main>
  )
}