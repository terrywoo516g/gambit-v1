'use client'

import { useEffect, useState, useRef } from 'react'

export type RunStream = {
  runId: string
  model: string
  content: string
  status: 'queued' | 'streaming' | 'done' | 'error'
}

export function useMultiStream(
  workspaceId: string | null,
  runs: { id: string; model: string }[]
) {
  const [streams, setStreams] = useState<Record<string, RunStream>>({})
  const sourcesRef = useRef<Record<string, EventSource>>({})
  const startedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!workspaceId || runs.length === 0) return

    // 初始化所有 stream 状态
    const initial: Record<string, RunStream> = {}
    runs.forEach(r => {
      initial[r.id] = { runId: r.id, model: r.model, content: '', status: 'queued' }
    })
    setStreams(initial)

    // 为每个 run 开启 SSE
    runs.forEach(run => {
      if (startedRef.current.has(run.id)) return
      startedRef.current.add(run.id)

      const es = new EventSource(`/api/workspaces/${workspaceId}/stream/${run.id}`)

      es.onmessage = (e) => {
        try {
          const chunk = JSON.parse(e.data)

          if (chunk.type === 'token') {
            setStreams(prev => ({
              ...prev,
              [run.id]: {
                ...prev[run.id],
                content: (prev[run.id]?.content || '') + chunk.data,
                status: 'streaming',
              },
            }))
          }

          if (chunk.type === 'done') {
            setStreams(prev => ({
              ...prev,
              [run.id]: { ...prev[run.id], status: 'done' },
            }))
            es.close()
          }

          if (chunk.type === 'error') {
            setStreams(prev => ({
              ...prev,
              [run.id]: { ...prev[run.id], status: 'error' },
            }))
            es.close()
          }
        } catch {}
      }

      es.onerror = () => {
        setStreams(prev => ({
          ...prev,
          [run.id]: { ...prev[run.id], status: 'error' },
        }))
        es.close()
      }

      sourcesRef.current[run.id] = es
    })

    return () => {
      Object.values(sourcesRef.current).forEach(es => es.close())
      sourcesRef.current = {}
      startedRef.current.clear()
    }
  }, [workspaceId, runs.length])

  const allDone = Object.values(streams).length > 0 &&
    Object.values(streams).every(s => s.status === 'done' || s.status === 'error')

  const completedCount = Object.values(streams).filter(s => s.status === 'done').length

  return { streams, allDone, completedCount, total: runs.length }
}
