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
  const bufferRef = useRef<Record<string, string>>({})
  const flushTimerRef = useRef<any>(null)

  useEffect(() => {
    if (!workspaceId || runs.length === 0) return

    function appendToken(runId: string, chunk: string) {
      bufferRef.current[runId] = (bufferRef.current[runId] ?? '') + chunk
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          const snapshot = { ...bufferRef.current }
          bufferRef.current = {}
          flushTimerRef.current = null
          setStreams(prev => {
            const next = { ...prev }
            for (const [id, text] of Object.entries(snapshot)) {
              if (!text) continue // done handler cleared this run's buffer; don't revert its status
              next[id] = {
                ...next[id],
                content: (next[id]?.content ?? '') + text,
                status: 'streaming',
              }
            }
            return next
          })
        }, 80)
      }
    }

    // 关闭上一个连接
    sourceRef.current?.close()

    const es = new EventSource(`/api/workspaces/${workspaceId}/stream-all`)
    sourceRef.current = es

    es.onmessage = (event) => {
      try {
        console.log('[SSE]', event.data.slice(0, 100))
        const data = JSON.parse(event.data)
        const { type, runId } = data

        if (type === 'all-done') { es.close(); sourceRef.current = null; return }
        if (!runId) return

        if (type === 'token' || type === 'delta') {
          const chunk = data.token ?? data.text ?? data.content ?? ''
          if (chunk) appendToken(runId, chunk)
          return
        }

        if (type === 'done') {
          // 先 flush buffer 再设 done
          const buffered = bufferRef.current[runId] ?? ''
          bufferRef.current[runId] = ''
          setStreams(prev => ({
            ...prev,
            [runId]: {
              ...prev[runId],
              content: data.content ?? ((prev[runId]?.content ?? '') + buffered),
              status: 'done',
            }
          }))
          return
        }

        if (type === 'error') {
          setStreams(prev => {
            import('@/lib/track').then(({ track }) => {
              track('ai_failed', { runId, model: prev[runId]?.model, error: data.error || 'Unknown error' })
            }).catch(console.error)
            return {
              ...prev,
              [runId]: { ...prev[runId], status: 'error' }
            }
          })
        }
      } catch (e) {
        console.error('[SSE parse error]', e, event.data)
      }
    }

    es.onerror = (err) => {
      reportError('useMultiStream', err, { workspaceId })
      es.close()
      sourceRef.current = null
    }

    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
      bufferRef.current = {}
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
