'use client'
import { useEffect, useRef, useState } from 'react'
import { reportError } from '@/lib/track'

export type StreamState = {
  runId: string
  model: string
  content: string
  status: 'idle' | 'streaming' | 'done' | 'error'
}

export function useMultiStream(
  workspaceId: string | null,
  runs: { id: string; model: string }[]
) {
  const [streams, setStreams] = useState<Record<string, StreamState>>(() => {
    const initial: Record<string, StreamState> = {}
    runs.forEach(r => {
      initial[r.id] = { runId: r.id, model: r.model, content: '', status: 'idle' }
    })
    return initial
  })
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!workspaceId || runs.length === 0) return

    // 关闭上一个连接
    sourceRef.current?.close()

    const es = new EventSource(`/api/workspaces/${workspaceId}/stream-all`)
    sourceRef.current = es

    es.onmessage = (event) => {
      console.log('[SSE]', event.data.slice(0, 100))
      try {
        const data = JSON.parse(event.data)
        const runId = data.runId
        if (!runId) return

        if (data.type === 'delta' || data.type === 'token') {
          // 兼容 text 和 token 两种字段名
          const chunk = data.text ?? data.token ?? ''
          if (!chunk) return

          setStreams(prev => ({
            ...prev,
            [runId]: {
              ...prev[runId],
              content: (prev[runId]?.content ?? '') + chunk,
              status: 'streaming',
            }
          }))

        } else if (data.type === 'done') {
          setStreams(prev => ({
            ...prev,
            [runId]: {
              ...prev[runId],
              content: data.content ?? prev[runId]?.content ?? '',
              status: 'done',
            }
          }))

        } else if (data.type === 'error') {
          setStreams(prev => {
            import('@/lib/track').then(({ track }) => {
              track('ai_failed', { runId, model: prev[runId]?.model, error: data.error || 'Unknown error' })
            }).catch(console.error)
            return {
              ...prev,
              [runId]: {
                ...prev[runId],
                status: 'error',
              }
            }
          })
        }
      } catch (e) {
        console.error('[useMultiStream] parse error:', e)
      }
    }

    es.onerror = (err) => {
      reportError('useMultiStream', err, { workspaceId })
      es.close()
      sourceRef.current = null
    }

    return () => {
      es.close()
      sourceRef.current = null
    }
  }, [workspaceId, runs.length]) // ← 依赖加上 runs.length

  const values = Object.values(streams)
  const allDone = values.length > 0 && values.every(s => s.status === 'done' || s.status === 'error')
  const completedCount = values.filter(s => s.status === 'done').length
  const total = values.length

  return { streams, allDone, completedCount, total }
}
