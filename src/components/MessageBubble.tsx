'use client'

import { useMemo } from 'react'
import { useMessageStream } from '@/hooks/useMessageStream'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  id: string
  role: 'user' | 'ai'
  modelId?: string | null
  initialContent: string
  status: 'pending' | 'streaming' | 'done' | 'failed'
  onRetry?: (id: string) => void
}

export function MessageBubble({
  id,
  role,
  modelId,
  initialContent,
  status,
  onRetry,
}: MessageBubbleProps) {
  const shouldStream = role === 'ai' && (status === 'pending' || status === 'streaming')
  const { content: streamedContent, status: streamStatus } = useMessageStream(
    shouldStream ? id : null
  )

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
        <div className="max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="mb-2 text-xs font-medium text-red-500">{modelId ?? 'AI'}</div>
          <div>回复失败</div>
          {onRetry ? (
            <button
              type="button"
              className="mt-3 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
              onClick={() => onRetry(id)}
            >
              重试
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-3xl rounded-2xl px-4 py-3 shadow-sm',
          isUser ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-900'
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
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-6">{displayContent}</div>
        )}

        {!isUser && shouldStream && streamStatus === 'streaming' && !hasStreamedContent ? (
          <div className="mt-2 text-xs text-slate-400">正在思考...</div>
        ) : null}
      </div>
    </div>
  )
}
