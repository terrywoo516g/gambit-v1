'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { MentionInput } from '@/components/MentionInput'
import { MessageBubble } from '@/components/MessageBubble'

type MessageStatus = 'pending' | 'streaming' | 'done' | 'failed'

type WorkspaceMessage = {
  id: string
  role: 'user' | 'ai'
  modelId?: string | null
  content: string
  status: MessageStatus
}

type WorkspaceResponse = {
  workspace: {
    id: string
    title: string
    messages: WorkspaceMessage[]
  }
}

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const workspaceId = params.id
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
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

  const activeModels = useMemo(() => {
    return Array.from(new Set(messages.map((message) => message.modelId).filter(Boolean))) as string[]
  }, [messages])

  async function handleSubmit(payload: {
    text: string
    mentions: { models: string[]; tool: string | null }
  }) {
    if (payload.mentions.tool) {
      const normalizedToolName = payload.mentions.tool.replace('@', '')
      const toolMap: Record<string, 'diverge' | 'synthesize'> = {
        分歧官: 'diverge',
        合成官: 'synthesize',
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

        setMessages((prev) => [...prev, ...newMessages])
        return
      } catch (error) {
        alert(error instanceof Error ? error.message : '工具调用失败')
        return
      } finally {
        setSending(false)
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
    }
  }

  return (
    <main className="flex h-screen bg-slate-50 text-slate-900">
      <aside className="w-48 border-r border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-900">数据源</div>
        <div className="mt-4 text-sm text-slate-500">暂无内容</div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="text-lg font-semibold">Gambit</div>
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
              <div className="text-sm text-slate-500">加载中...</div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    id={message.id}
                    role={message.role}
                    modelId={message.modelId}
                    initialContent={message.content}
                    status={message.status}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <MentionInput onSubmit={handleSubmit} disabled={sending} />
          </div>
        </div>
      </section>

      <aside className="w-56 border-l border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-900">产出</div>
        <div className="mt-4 text-sm text-slate-500">暂无产出</div>
      </aside>
    </main>
  )
}
