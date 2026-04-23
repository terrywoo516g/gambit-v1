'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'

export type RunStream = {
  runId: string
  model: string
  content: string
  status: 'queued' | 'streaming' | 'done' | 'error' | 'retrying'
}

const MAX_RETRIES = 2
const RETRY_DELAY = 2000

export function useMultiStream(
  workspaceId: string | null,
  runs: { id: string; model: string }[]
) {
  const [streams, setStreams] = useState<Record<string, RunStream>>({})
  const sourcesRef = useRef<Record<string, EventSource>>({})
  const retriesRef = useRef<Record<string, number>>({})
  const mountedRef = useRef(true)

  const runsKey = JSON.stringify(runs.map(r => r.id).sort())

  const connectRun = useCallback((
    wsId: string,
    run: { id: string; model: string }
  ) => {
    if (sourcesRef.current[run.id]) return

    const es = new EventSource(`/api/workspaces/${wsId}/stream/${run.id}`)
    sourcesRef.current[run.id] = es

    es.onmessage = (e) => {
      if (!mountedRef.current) return
      try {
        const chunk = JSON.parse(e.data)

        if (chunk.type === 'token') {
          flushSync(() => {
            setStreams(prev => ({
              ...prev,
              [run.id]: {
                runId: run.id,
                model: run.model,
                content: (prev[run.id]?.content || '') + chunk.data,
                status: 'streaming',
              },
            }))
          })
        }

        if (chunk.type === 'retry') {
          setStreams(prev => ({
            ...prev,
            [run.id]: {
              runId: run.id,
              model: run.model,
              content: '',
              status: 'retrying',
            },
          }))
        }

        if (chunk.type === 'done') {
          setStreams(prev => ({
            ...prev,
            [run.id]: {
              ...prev[run.id],
              runId: run.id,
              model: run.model,
              status: 'done',
            },
          }))
          es.close()
          delete sourcesRef.current[run.id]
        }

        if (chunk.type === 'error') {
          setStreams(prev => ({
            ...prev,
            [run.id]: {
              runId: run.id,
              model: run.model,
              content: prev[run.id]?.content || '',
              status: 'error',
            },
          }))
          es.close()
          delete sourcesRef.current[run.id]
        }
      } catch {
        // JSON 解析失败，忽略
      }
    }

    es.onerror = () => {
      if (!mountedRef.current) return

      es.close()
      delete sourcesRef.current[run.id]

      const currentRetries = retriesRef.current[run.id] || 0
      if (currentRetries < MAX_RETRIES) {
        retriesRef.current[run.id] = currentRetries + 1
        setStreams(prev => ({
          ...prev,
          [run.id]: {
            runId: run.id,
            model: run.model,
            content: prev[run.id]?.content || '',
            status: 'retrying',
          },
        }))
        setTimeout(() => {
          if (mountedRef.current) connectRun(wsId, run)
        }, RETRY_DELAY)
      } else {
        setStreams(prev => ({
          ...prev,
          [run.id]: {
            runId: run.id,
            model: run.model,
            content: prev[run.id]?.content || '',
            status: 'error',
          },
        }))
      }
    }
  }, [])

  useEffect(() => {
    if (!workspaceId || runs.length === 0) return

    mountedRef.current = true

    const initial: Record<string, RunStream> = {}
    runs.forEach(r => {
      initial[r.id] = { runId: r.id, model: r.model, content: '', status: 'queued' }
    })
    setStreams(initial)
    retriesRef.current = {}

    runs.forEach(run => {
      connectRun(workspaceId, run)
    })

    return () => {
      mountedRef.current = false
      Object.values(sourcesRef.current).forEach(es => {
        try { es.close() } catch {}
      })
      sourcesRef.current = {}
      retriesRef.current = {}
    }
  }, [workspaceId, runsKey, connectRun])

  const allDone = Object.values(streams).length > 0 &&
    Object.values(streams).every(s => s.status === 'done' || s.status === 'error')

  const completedCount = Object.values(streams).filter(s => s.status === 'done').length

  return { streams, allDone, completedCount, total: runs.length }
}