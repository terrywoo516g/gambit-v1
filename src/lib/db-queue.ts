/**
 * SQLite 写入队列
 * 所有数据库写操作通过此队列串行执行，从根本上消除并发写入冲突
 */

type QueueItem = {
  fn: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

const queue: QueueItem[] = []
let processing = false

async function processQueue() {
  if (processing) return
  processing = true

  while (queue.length > 0) {
    const item = queue.shift()!
    try {
      const result = await item.fn()
      item.resolve(result)
    } catch (err) {
      item.reject(err)
    }
  }

  processing = false
}

export function dbWrite<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      fn: fn as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
    })
    processQueue()
  })
}
