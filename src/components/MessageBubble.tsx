'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useMessageStream } from '@/hooks/useMessageStream'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageBubbleProps {
  id: string
  role: 'user' | 'ai'
  modelId?: string | null
  initialContent: string
  status: 'pending' | 'streaming' | 'done' | 'failed'
  onRetry?: (id: string) => void
  onStreamDone?: (id: string) => void
}

export function MessageBubble({
  id,
  role,
  modelId,
  initialContent,
  status,
  onRetry,
  onStreamDone,
}: MessageBubbleProps) {
  const shouldStream = role === 'ai' && (status === 'pending' || status === 'streaming')
  const { content: streamedContent, status: streamStatus } = useMessageStream(
    shouldStream ? id : null
  )
  const notifiedRef = useRef(false)

  useEffect(() => {
    if (!shouldStream) return
    if (!onStreamDone) return
    if (notifiedRef.current) return

    if (streamStatus === 'done') {
      notifiedRef.current = true
      onStreamDone(id)
    }
  }, [id, onStreamDone, shouldStream, streamStatus])

  const isUser = role === 'user'
  const hasStreamedContent = streamedContent.trim().length > 0
  const hasFailed = status === 'failed' || streamStatus === 'error'
  const isLoading = shouldStream && !hasStreamedContent && !hasFailed
  const modelLabelClass = useMemo(() => {
    if (modelId === '分歧官-激进') return 'text-red-500'
    if (modelId === '分歧官-稳健') return 'text-blue-500'
    if (modelId === '分歧官-务实') return 'text-green-500'
    if (modelId === '合成官') return 'text-purple-500'
    return isUser ? 'text-slate-200' : 'text-slate-500'
  }, [isUser, modelId])

  const displayContent = useMemo(() => {
    if (hasStreamedContent) return streamedContent
    if (status === 'done') return initialContent
    return initialContent
  }, [hasStreamedContent, initialContent, status, streamedContent])

  if (hasFailed) {
    return (
      <div className="flex w-full justify-start">
        <div className="max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="mb-2 text-xs font-medium text-red-500">{modelId ?? 'AI'}</div>
          <div className="text-xs text-red-500 mt-2">
            生成失败
            <button
              onClick={() => onRetry?.(id)}
              className="ml-2 underline hover:text-red-600"
            >
              点击重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-2xl px-4 py-3 shadow-sm',
          isUser 
            ? 'max-w-lg bg-slate-900 text-white' 
            : 'max-w-2xl border border-slate-200 bg-white text-slate-900'
        )}
      >
        <div className={cn('mb-2 text-xs font-medium', modelLabelClass)}>
          {isUser ? '👤 你' : modelId ?? 'AI'}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-56 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-44 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-52 animate-pulse rounded bg-slate-200" />
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap text-sm leading-6">{displayContent}</div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({children}) => <h1 className="text-xl font-bold my-2">{children}</h1>,
              h2: ({children}) => <h2 className="text-lg font-bold my-2">{children}</h2>,
              h3: ({children}) => <h3 className="text-base font-semibold my-1">{children}</h3>,
              p: ({children}) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({children}) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
              li: ({children}) => <li className="leading-relaxed">{children}</li>,
              strong: ({children}) => <strong className="font-semibold">{children}</strong>,
              code: ({children}) => <code className="bg-gray-100 px-1 rounded text-sm font-mono">{children}</code>,
              pre: ({children}) => <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto my-2">{children}</pre>,
            }}
          >
            {displayContent}
          </ReactMarkdown>
        )}

        {!isUser && shouldStream && streamStatus === 'streaming' && !hasStreamedContent ? (
          <div className="mt-2 text-xs text-slate-400">正在思考...</div>
        ) : null}
      </div>
    </div>
  )
}
