'use client'
import { useEffect, useRef, useState } from 'react'

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
  const [streams, setStreams] = useState<Record<string, StreamState>>({})
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!workspaceId || runs.length === 0) return

    // 初始化每个 run 的状态
    const initial: Record<string, StreamState> = {}
    runs.forEach(r => {
      initial[r.id] = { runId: r.id, model: r.model, content: '', status: 'idle' }
    })
    setStreams(initial)

    // 关闭上一个连接
    sourceRef.current?.close()

    const es = new EventSource(`/api/workspaces/${workspaceId}/stream-all`)
    sourceRef.current = es

    es.onmessage = (event) => {
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
          setStreams(prev => ({
            ...prev,
            [runId]: {
              ...prev[runId],
              status: 'error',
            }
          }))
        }
      } catch (e) {
        console.error('[useMultiStream] parse error:', e)
      }
    }

    es.onerror = () => {
      es.close()
      sourceRef.current = null
    }

    return () => {
      es.close()
      sourceRef.current = null
    }
  }, [workspaceId]) // ← 只依赖 workspaceId，runs 不放进来避免重复触发

  const values = Object.values(streams)
  const allDone = values.length > 0 && values.every(s => s.status === 'done' || s.status === 'error')
  const completedCount = values.filter(s => s.status === 'done').length
  const total = values.length

  return { streams, allDone, completedCount, total }
}
