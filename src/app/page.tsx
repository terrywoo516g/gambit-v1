'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MentionInput } from '@/components/MentionInput'

export default function HomePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(payload: {
    text: string
    mentions: { models: string[]; tool: string | null }
  }) {
    try {
      setSubmitting(true)

      const wsResp = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.text.slice(0, 30) }),
      })

      if (!wsResp.ok) {
        throw new Error('创建工作台失败')
      }

      const { workspace } = (await wsResp.json()) as {
        workspace: { id: string }
      }

      const sendResp = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          text: payload.text,
          mentions: payload.mentions,
        }),
      })

      if (!sendResp.ok) {
        const data = (await sendResp.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? '发送失败')
      }

      router.push('/workspace/' + workspace.id)
    } catch (error) {
      alert(error instanceof Error ? error.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Gambit 工作台</h1>
        <p className="mt-3 text-base text-slate-500">重要决定，不该只听一个 AI 的</p>

        <div className="mx-auto mt-10 max-w-[640px] text-left">
          <MentionInput onSubmit={handleSubmit} disabled={submitting} />
        </div>
      </div>
    </main>
  )
}
