'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MentionInput } from '@/components/MentionInput'
import { MessageBubble } from '@/components/MessageBubble'
import { ArtifactPanel } from '@/components/ArtifactPanel'

type MessageStatus = 'pending' | 'streaming' | 'done' | 'failed'

type WorkspaceMessage = {
  id: string
  role: 'user' | 'ai'
  modelId?: string | null
  content: string
  status: MessageStatus
}

type WorkspaceArtifact = {
  id: string
  type: string
  content: string
  version: number
  createdAt?: string
}

type WorkspaceResponse = {
  workspace: {
    id: string
    title: string
    messages: WorkspaceMessage[]
    artifacts?: WorkspaceArtifact[]
  }
}

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const workspaceId = params.id
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [workspaceTitle, setWorkspaceTitle] = useState('')
  const [followUpText, setFollowUpText] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!workspaceId) return

    let active = true

    async function loadWorkspace() {
      try {
        setLoading(true)
        const response = await fetch('/api/workspace/' + workspaceId)
        const data = (await response.json()) as WorkspaceResponse & { error?: string }

        if (!response.ok) {
          throw new Error(data.error ?? '加载工作台失败')
        }

        if (active) {
          setMessages(data.workspace.messages)
          setArtifacts(data.workspace.artifacts ?? [])
          setWorkspaceTitle(data.workspace.title)
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : '加载工作台失败')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadWorkspace()

    return () => {
      active = false
    }
  }, [workspaceId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function refreshArtifacts() {
    if (!workspaceId) return
    const response = await fetch('/api/workspace/' + workspaceId)
    const data = (await response.json()) as WorkspaceResponse
    setArtifacts(data.workspace.artifacts ?? [])
  }

  const activeModels = useMemo(() => {
    return Array.from(new Set(messages.map((message) => message.modelId).filter(Boolean))) as string[]
  }, [messages])

  const rounds = useMemo(() => {
    const result: { userMsg: WorkspaceMessage; aiMsgs: WorkspaceMessage[] }[] = []
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') {
        const aiMsgs: WorkspaceMessage[] = []
        let j = i + 1
        while (j < messages.length && messages[j].role === 'ai') {
          aiMsgs.push(messages[j])
          j++
        }
        result.push({ userMsg: messages[i], aiMsgs })
      }
    }
    return result
  }, [messages])

  async function handleNewWorkspace() {
    const res = await fetch('/api/workspace/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '新工作台' }),
    })
    const data = await res.json()
    router.push('/workspace/' + data.workspace.id)
  }

  async function handleRetry(messageId: string) {
    await fetch(`/api/message/${messageId}/retry`, { method: 'POST' })
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, status: 'pending' as const, content: '' } : m
      )
    )
  }

  async function handleSubmit(payload: {
    text: string
    mentions: { models: string[]; tool: string | null }
  }) {
    if (payload.mentions.tool) {
      const normalizedToolName = payload.mentions.tool.replace('@', '')
      const toolMap: Record<string, 'diverge' | 'synthesize' | 'review' | 'compare'> = {
        分歧官: 'diverge',
        合成官: 'synthesize',
        审稿官: 'review',
        比稿官: 'compare',
      }
      const tool = toolMap[normalizedToolName]

      if (!tool) {
        alert('该功能即将上线：' + payload.mentions.tool)
        return
      }

      try {
        setSending(true)

        const response = await fetch('/api/tool/invoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            tool,
            question: payload.text,
          }),
        })

        const data = (await response.json()) as {
          error?: string
          userMessageId: string
          messageIds: string[]
        }

        if (!response.ok) {
          throw new Error(data.error ?? '工具调用失败')
        }

        const newMessages: WorkspaceMessage[] = []

        if (tool === 'diverge') {
          newMessages.push(
            { id: data.userMessageId, role: 'user', content: payload.text, status: 'done' },
            {
              id: data.messageIds[0],
              role: 'ai',
              modelId: '分歧官-激进',
              content: '',
              status: 'pending',
            },
            {
              id: data.messageIds[1],
              role: 'ai',
              modelId: '分歧官-稳健',
              content: '',
              status: 'pending',
            },
            {
              id: data.messageIds[2],
              role: 'ai',
              modelId: '分歧官-务实',
              content: '',
              status: 'pending',
            }
          )
        }

        if (tool === 'synthesize') {
          newMessages.push({
            id: data.messageIds[0],
            role: 'ai',
            modelId: '合成官',
            content: '',
            status: 'pending',
          })
        }

        if (tool === 'review') {
          newMessages.push(
            { id: data.userMessageId, role: 'user', content: payload.text, status: 'done' },
            {
              id: data.messageIds[0],
              role: 'ai',
              modelId: '审稿官-逻辑',
              content: '',
              status: 'pending',
            },
            {
              id: data.messageIds[1],
              role: 'ai',
              modelId: '审稿官-文字',
              content: '',
              status: 'pending',
            }
          )
        }

        if (tool === 'compare') {
          newMessages.push(
            { id: data.userMessageId, role: 'user', content: payload.text, status: 'done' },
            {
              id: data.messageIds[0],
              role: 'ai',
              modelId: '比稿官',
              content: '',
              status: 'pending',
            }
          )
        }

        setMessages((prev) => [...prev, ...newMessages])
        return
      } catch (error) {
        alert(error instanceof Error ? error.message : '工具调用失败')
        return
      } finally {
        setSending(false)
        setFollowUpText('')
      }
    }

    try {
      setSending(true)

      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          text: payload.text,
          mentions: payload.mentions,
        }),
      })

      const data = (await response.json()) as {
        error?: string
        userMessageId: string
        messageIds: string[]
      }

      if (!response.ok) {
        throw new Error(data.error ?? '发送失败')
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.userMessageId,
          role: 'user',
          content: payload.text,
          status: 'done',
        },
        ...data.messageIds.map((messageId, index) => ({
          id: messageId,
          role: 'ai' as const,
          modelId: payload.mentions.models[index],
          content: '',
          status: 'pending' as const,
        })),
      ])
    } catch (error) {
      alert(error instanceof Error ? error.message : '发送失败')
    } finally {
      setSending(false)
      setFollowUpText('')
    }
  }

  return (
    <main className="flex h-screen bg-slate-50 text-slate-900">
      <aside className="w-52 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <button
            onClick={() => router.push('/workspaces')}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2"
          >
            ← 历史工作台
          </button>
          <div className="text-sm font-semibold text-slate-800 truncate">
            {workspaceTitle || 'Gambit 工作台'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {rounds.map((round, idx) => (
            <button
              key={round.userMsg.id}
              onClick={() => {
                document.getElementById('msg-' + round.userMsg.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-100 truncate"
            >
              <span className="text-slate-400 mr-1">#{idx + 1}</span>
              {round.userMsg.content.slice(0, 28)}
              {round.userMsg.content.length > 28 ? '…' : ''}
            </button>
          ))}
          {rounds.length === 0 && !loading && (
            <div className="text-xs text-slate-400 px-3 py-2">对话后这里会出现导航</div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleNewWorkspace}
            className="w-full text-xs bg-indigo-500 text-white rounded-lg py-2 hover:bg-indigo-400"
          >
            + 新建工作台
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="h-12 shrink-0 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <div className="text-base font-semibold">Gambit</div>
          <div className="flex flex-wrap gap-2">
            {activeModels.length > 0 ? (
              activeModels.map((model) => (
                <span
                  key={model}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                >
                  {model}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">暂无模型</span>
            )}
          </div>
          <div className="w-10" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="flex flex-col gap-4">
                <div className="flex w-full justify-start">
                  <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="mb-2 text-xs font-medium text-slate-500">AI</div>
                    <div className="space-y-2">
                      <div className="h-3 w-56 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-44 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-52 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
                <div className="flex w-full justify-start">
                  <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="mb-2 text-xs font-medium text-slate-500">AI</div>
                    <div className="space-y-2">
                      <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center max-w-md">
                  <img src="/mascot.png" className="w-24 mx-auto opacity-80" alt="mascot" />
                  <h2 className="text-xl font-semibold text-slate-700 mt-4">开始一次多 AI 协作</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    在下方输入问题，@ 选择两个以上模型或一位专家角色开始。
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <div key={message.id} id={"msg-" + message.id}>
                    <MessageBubble
                      id={message.id}
                      role={message.role}
                      modelId={message.modelId}
                      initialContent={message.content}
                      status={message.status}
                      onRetry={handleRetry}
                      onFollowUp={(modelId, quote) => {
                        setFollowUpText(`@${modelId}\n> ${quote}\n\n`)
                      }}
                      onStreamDone={() => {
                        if (
                          message.role === 'ai' &&
                          (message.modelId === '合成官' ||
                            (message.modelId?.startsWith('审稿官-') ?? false) ||
                            message.modelId === '比稿官')
                        ) {
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

          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <MentionInput onSubmit={handleSubmit} disabled={sending} prefillText={followUpText} />
          </div>
        </div>
      </section>

      <aside className="w-56 border-l border-slate-200 bg-white p-6">
        <ArtifactPanel
          key={`${workspaceId}:${artifacts.length}:${artifacts[artifacts.length - 1]?.id ?? ''}`}
          workspaceId={workspaceId}
        />
      </aside>
    </main>
  )
}
