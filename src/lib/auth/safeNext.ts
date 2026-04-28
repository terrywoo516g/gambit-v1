export function safeNext(next?: string | null): string {
  if (!next) return '/'
  if (typeof next !== 'string') return '/'
  if (!next.startsWith('/')) return '/'
  if (next.startsWith('//')) return '/'
  if (next.startsWith('/api/')) return '/'
  return next
}