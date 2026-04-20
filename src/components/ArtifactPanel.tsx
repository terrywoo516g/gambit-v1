'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ArtifactType = 'synthesis' | 'review_report' | string

type Artifact = {
  id: string
  type: ArtifactType
  content: string
  version: number
  createdAt?: string
}

interface ArtifactPanelProps {
  workspaceId: string
}

export function ArtifactPanel({ workspaceId }: ArtifactPanelProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])

  useEffect(() => {
    if (!workspaceId) return

    let active = true

    async function load() {
      const response = await fetch('/api/workspace/' + workspaceId)
      const data = (await response.json()) as {
        workspace?: { artifacts?: Artifact[] }
      }

      if (!active) return
      setArtifacts(data.workspace?.artifacts ?? [])
    }

    void load()
    const timer = setInterval(() => void load(), 2000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [workspaceId])

  const latest = useMemo(() => {
    if (artifacts.length === 0) return null
    const sorted = [...artifacts].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return (b.version ?? 0) - (a.version ?? 0)
    })
    return sorted[0]
  }, [artifacts])

  const title = useMemo(() => {
    if (!latest) return '产出'
    if (latest.type === 'synthesis') return '综合建议'
    if (latest.type === 'review_report') return '审稿报告'
    if (latest.type === 'compare_table') return '对比分析'
    return '产出'
  }, [latest])

  async function copy() {
    if (!latest) return
    try {
      await navigator.clipboard.writeText(latest.content)
    } catch {}
  }

  return (
    <div className="flex h-full flex-col">
      <div className="text-sm font-semibold text-slate-900">{title}</div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {latest ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="my-2 text-xl font-bold">{children}</h1>,
              h2: ({ children }) => <h2 className="my-2 text-lg font-bold">{children}</h2>,
              h3: ({ children }) => <h3 className="my-1 text-base font-semibold">{children}</h3>,
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children }) => (
                <code className="rounded bg-gray-100 px-1 font-mono text-sm">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="my-2 overflow-x-auto rounded bg-gray-100 p-2 text-sm">{children}</pre>
              ),
            }}
          >
            {latest.content}
          </ReactMarkdown>
        ) : (
          <div className="text-sm text-slate-500">暂无产出</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void copy()}
        disabled={!latest}
        className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        复制全文
      </button>
    </div>
  )
}
