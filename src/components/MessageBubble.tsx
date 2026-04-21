'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMessageStream } from '@/hooks/useMessageStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageBubbleProps {
  id: string; role: 'user' | 'ai'; modelId?: string | null; initialContent: string
  status: 'pending' | 'streaming' | 'done' | 'failed'; isActive?: boolean
  onRetry?: (id: string) => void; onStreamDone?: (id: string) => void
  onFollowUp?: (modelId: string, quote: string) => void
}

const MODEL_COLORS: Record<string, { dot: string; badge: string; bg: string }> = {
  '分歧官-激进': { dot: 'bg-red-400', badge: 'bg-red-50 text-red-700', bg: 'border-red-100' },
  '分歧官-稳健': { dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700', bg: 'border-blue-100' },
  '分歧官-务实': { dot: 'bg-green-400', badge: 'bg-green-50 text-green-700', bg: 'border-green-100' },
  '合成官': { dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700', bg: 'border-purple-100' },
  '审稿官-逻辑': { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700', bg: 'border-orange-100' },
  '审稿官-文字': { dot: 'bg-teal-400', badge: 'bg-teal-50 text-teal-700', bg: 'border-teal-100' },
  '比稿官': { dot: 'bg-pink-400', badge: 'bg-pink-50 text-pink-700', bg: 'border-pink-100' },
}
const DEFAULT_COLOR = { dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-700', bg: 'border-gray-100' }

export function MessageBubble({ id, role, modelId, initialContent, status, isActive, onRetry, onStreamDone, onFollowUp }: MessageBubbleProps) {
  const shouldStream = role === 'ai' && (status === 'pending' || status === 'streaming')
  const { content: streamedContent, status: streamStatus } = useMessageStream(shouldStream ? id : null)
  const notifiedRef = useRef(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!shouldStream || !onStreamDone || notifiedRef.current) return
    if (streamStatus === 'done') { notifiedRef.current = true; onStreamDone(id); setTimeout(() => setCollapsed(true), 300) }
  }, [id, onStreamDone, shouldStream, streamStatus])

  useEffect(() => {
    if (role === 'ai' && status === 'done' && initialContent.length > 0) setCollapsed(true)
  }, [])

  const isUser = role === 'user'
  const hasFailed = status === 'failed' || streamStatus === 'error'
  const hasStreamedContent = streamedContent.trim().length > 0
  const isLoading = shouldStream && !hasStreamedContent && !hasFailed
  const displayContent = useMemo(() => hasStreamedContent ? streamedContent : initialContent, [hasStreamedContent, initialContent, streamedContent])
  const previewText = useMemo(() => {
    const plain = displayContent.replace(/[#*`>\-\[\]()]/g, '').replace(/\n+/g, ' ').trim()
    return plain.length > 150 ? plain.slice(0, 150) + '…' : plain
  }, [displayContent])
  const colors = modelId ? (MODEL_COLORS[modelId] ?? DEFAULT_COLOR) : DEFAULT_COLOR

  if (isUser) return (
    <div className="flex w-full justify-end">
      <div className="max-w-lg rounded-2xl bg-ink text-white px-4 py-3 shadow-sm">
        <div className="whitespace-pre-wrap text-sm leading-6">{displayContent}</div>
      </div>
    </div>
  )

  if (hasFailed) return (
    <div className="flex w-full justify-start">
      <div className="max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="text-xs font-medium text-red-500">{modelId ?? 'AI'}</div>
        <div className="text-xs text-red-500 mt-2">生成失败
          <button onClick={() => onRetry?.(id)} className="ml-2 underline hover:text-red-600">点击重试</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex w-full justify-start">
      <div className={`w-full max-w-3xl rounded-xl border bg-white shadow-sm transition-all ${colors.bg} ${isActive ? 'ring-2 ring-accent/30' : ''}`}>
        <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
          onClick={() => { if (status === 'done' || streamStatus === 'done') setCollapsed(prev => !prev) }}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLoading || (shouldStream && hasStreamedContent) ? 'bg-amber-400 animate-pulse' : colors.dot}`}/>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>{modelId ?? 'AI'}</span>
            {isLoading && <span className="text-[10px] text-ink-light/50 font-mono">思考中...</span>}
          </div>
          {(status === 'done' || streamStatus === 'done') && displayContent.length > 0 && (
            <button className="text-ink-light/40 hover:text-ink-light transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          )}
        </div>
        <div className="px-4 pb-3">
          {isLoading ? (
            <div className="space-y-2 py-1">
              <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse"/>
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"/>
            </div>
          ) : collapsed ? (
            <div>
              <p className="text-sm text-ink-light leading-relaxed line-clamp-2">{previewText}</p>
              <button onClick={e => { e.stopPropagation(); setCollapsed(false) }}
                className="text-[11px] text-accent hover:text-accent/70 mt-1.5 font-medium transition">展开全文 ↓</button>
            </div>
          ) : (
            <div className="prose-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                h1: ({children}) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                h2: ({children}) => <h2 className="text-base font-bold my-2">{children}</h2>,
                h3: ({children}) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                p: ({children}) => <p className="my-1 text-sm leading-relaxed">{children}</p>,
                ul: ({children}) => <ul className="list-disc pl-4 my-1 space-y-0.5 text-sm">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal pl-4 my-1 space-y-0.5 text-sm">{children}</ol>,
                li: ({children}) => <li className="leading-relaxed text-sm">{children}</li>,
                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                code: ({children}) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                pre: ({children}) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto my-2">{children}</pre>,
                table: ({children}) => <table className="border-collapse border border-gray-200 my-2 text-xs w-full">{children}</table>,
                th: ({children}) => <th className="border border-gray-200 px-2 py-1 bg-gray-50 font-semibold text-left">{children}</th>,
                td: ({children}) => <td className="border border-gray-200 px-2 py-1">{children}</td>,
              }}>{displayContent}</ReactMarkdown>
              {(status === 'done' || streamStatus === 'done') && onFollowUp && modelId && (
                <div className="mt-3 pt-2 border-t border-black/5">
                  <button onClick={() => {
                    onFollowUp(modelId, displayContent.slice(0, 100) + (displayContent.length > 100 ? '…' : ''))
                  }} className="text-[11px] text-ink-light hover:text-accent transition">追问此 AI →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}