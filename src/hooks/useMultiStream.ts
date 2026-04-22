'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

export type RunStream = {
  runId: string
  model: string
  content: string
  status: 'queued' | 'streaming' | 'done' | 'error'
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

  // 稳定化 runs 引用：用 JSON 序列化做依赖比较
  const runsKey = JSON.stringify(runs.map(r => r.id).sort())

  const connectRun = useCallback((
    wsId: string,
    run: { id: string; model: string }
  ) => {
    // 如果已经有活跃连接，不重复创建
    if (sourcesRef.current[run.id]) {
      return
    }

    const es = new EventSource(`/api/workspaces/${wsId}/stream/${run.id}`)
    sourcesRef.current[run.id] = es

    es.onmessage = (e) => {
      if (!mountedRef.current) return
      try {
        const chunk = JSON.parse(e.data)

        if (chunk.type === 'token') {
          setStreams(prev => ({
            ...prev,
            [run.id]: {
              runId: run.id,
              model: run.model,
              content: (prev[run.id]?.content || '') + chunk.data,
              status: 'streaming',
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
        // JSON 解析失败，忽略这个 chunk
      }
    }

    es.onerror = () => {
      if (!mountedRef.current) return

      es.close()
      delete sourcesRef.current[run.id]

      // 自动重连：如果还没超过最大重试次数
      const currentRetries = retriesRef.current[run.id] || 0
      if (currentRetries < MAX_RETRIES) {
        retriesRef.current[run.id] = currentRetries + 1
        console.log(`[useMultiStream] Retrying ${run.model} (attempt ${currentRetries + 1}/${MAX_RETRIES})`)

        setTimeout(() => {
          if (mountedRef.current) {
            connectRun(wsId, run)
          }
        }, RETRY_DELAY)
      } else {
        // 重试耗尽，标记为错误
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

    // 初始化所有 stream 状态
    const initial: Record<string, RunStream> = {}
    runs.forEach(r => {
      initial[r.id] = { runId: r.id, model: r.model, content: '', status: 'queued' }
    })
    setStreams(initial)

    // 重置重试计数
    retriesRef.current = {}

    // 所有 SSE 同时启动，不再加延迟
    // 后端的 retryPrisma 已经处理了 SQLite 并发写入问题
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
