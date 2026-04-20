import { useEffect, useState } from 'react'

type StreamStatus = 'idle' | 'streaming' | 'done' | 'error'

type StreamChunk =
  | { type: 'token'; data: string }
  | { type: 'done'; data: unknown }
  | { type: 'error'; data: string }

export function useMessageStream(messageId: string | null) {
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<StreamStatus>('idle')

  useEffect(() => {
    if (!messageId) {
      setContent('')
      setStatus('idle')
      return
    }

    setContent('')
    setStatus('streaming')

    const es = new EventSource(`/api/stream/${messageId}`)

    es.onmessage = (e) => {
      const chunk = JSON.parse(e.data) as StreamChunk

      if (chunk.type === 'token') {
        setContent((prev) => prev + chunk.data)
      }

      if (chunk.type === 'done') {
        setStatus('done')
        es.close()
      }

      if (chunk.type === 'error') {
        setStatus('error')
        es.close()
      }
    }

    es.onerror = () => {
      setStatus('error')
      es.close()
    }

    return () => es.close()
  }, [messageId])

  return { content, status }
}
