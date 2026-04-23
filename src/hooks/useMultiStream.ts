'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface RunStream {
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

  // --- 核心改动：用 ref 缓冲 token，RAF 刷新 ---
  // 每个 runId 对应一个 token 缓冲区
  const bufferRef = useRef<Record<string, string[]>>({})
  // 每个 runId 的最终状态（done/error 时设置）
  const finalStateRef = useRef<Record<string, { status: 'done' | 'error'; content?: string }>>({})
  const rafRef = useRef<number>(0)
  const mountedRef = useRef(true)
  const sourcesRef = useRef<Record<string, EventSource>>({})
  const retryCountRef = useRef<Record<string, number>>({})

  // RAF 刷新循环：每帧把缓冲区内容合并到 React state
  const startFlushLoop = useCallback(() => {
    const flush = () => {
      if (!mountedRef.current) return

      const buffer = bufferRef.current
      const finals = finalStateRef.current
      let hasUpdate = false

      // 检查是否有新 token 或状态变更
      for (const runId in buffer) {
        if (buffer[runId].length > 0) {
          hasUpdate = true
          break
        }
      }
      for (const key in finals) {
        if (Object.prototype.hasOwnProperty.call(finals, key)) {
          hasUpdate = true
          break
        }
      }

      if (hasUpdate) {
        setStreams(prev => {
          const next = { ...prev }
          Object.values(next).forEach(s => {
            const newTokens = buffer[s.runId]
            const final = finals[s.runId]

            if (final) {
              delete finals[s.runId]
              const pendingTokens = newTokens ? newTokens.splice(0) : []
              next[s.runId] = {
                ...s,
                content: final.content ?? (s.content + pendingTokens.join('')),
                status: final.status
              }
            } else if (newTokens && newTokens.length > 0) {
              const tokens = newTokens.splice(0)
              next[s.runId] = {
                ...s,
                content: s.content + tokens.join(''),
                status: 'streaming'
              }
            }
          })
          return next
        })
      }

      rafRef.current = requestAnimationFrame(flush)
    }
    rafRef.current = requestAnimationFrame(flush)
  }, [])

  const connectStream = useCallback((runId: string, model: string) => {
    // 初始化缓冲区
    if (!bufferRef.current[runId]) {
      bufferRef.current[runId] = []
    }

    const url = `/api/workspaces/${workspaceId}/stream/${runId}`
    const es = new EventSource(url)
    sourcesRef.current[runId] = es

    es.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const chunk = JSON.parse(event.data)

        switch (chunk.type) {
          case 'token':
            // 写入 ref 缓冲区，不触发 React 渲染
            if (bufferRef.current[runId]) {
              bufferRef.current[runId].push(chunk.token)
            }
            break

          case 'retry':
            setStreams(prev => ({
              ...prev,
              [runId]: {
                ...prev[runId],
                status: 'retrying'
              }
            }))
            break

          case 'done':
            // 标记最终状态，让 RAF 循环处理
            finalStateRef.current[runId] = {
              status: 'done',
              content: chunk.content // 服务端返回的完整内容
            }
            es.close()
            delete sourcesRef.current[runId]
            break

          case 'error':
            finalStateRef.current[runId] = { status: 'error' }
            es.close()
            delete sourcesRef.current[runId]
            break
        }
      } catch (e) {
        console.error('SSE parse error:', e)
      }
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      es.close()
      delete sourcesRef.current[runId]

      const retries = retryCountRef.current[runId] || 0
      if (retries < MAX_RETRIES) {
        retryCountRef.current[runId] = retries + 1
        setStreams(prev => ({
          ...prev,
          [runId]: {
            ...prev[runId],
            status: 'retrying'
          }
        }))
        setTimeout(() => {
          if (mountedRef.current) {
            connectStream(runId, model)
          }
        }, RETRY_DELAY)
      } else {
        finalStateRef.current[runId] = { status: 'error' }
      }
    }
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId || runs.length === 0) return

    mountedRef.current = true
    bufferRef.current = {}
    finalStateRef.current = {}
    retryCountRef.current = {}

    // 初始化所有 stream 的状态
    const initialStreams: Record<string, RunStream> = {}
    runs.forEach(r => {
      initialStreams[r.id] = {
        runId: r.id,
        model: r.model,
        content: '',
        status: 'queued'
      }
    })
    setStreams(initialStreams)

    // 启动 RAF 刷新循环
    startFlushLoop()

    // 连接所有 stream
    runs.forEach(r => {
      bufferRef.current[r.id] = []
      connectStream(r.id, r.model)
    })

    return () => {
      mountedRef.current = false
      cancelAnimationFrame(rafRef.current)
      Object.values(sourcesRef.current).forEach(es => es.close())
      sourcesRef.current = {}
      bufferRef.current = {}
      finalStateRef.current = {}
    }
  }, [workspaceId, runs.length, connectStream, startFlushLoop])

  const allDone = Object.values(streams).length > 0 && Object.values(streams).every(s => s.status === 'done' || s.status === 'error')
  const completedCount = Object.values(streams).filter(s => s.status === 'done').length

  return { streams, allDone, completedCount, total: Object.values(streams).length }
}