export function track(event: string, props?: Record<string, any>) {
  if (typeof window === 'undefined') return
  console.log('[track]', event, props)
  // TODO: D14 接入正式埋点服务
}

export function reportError(scope: string, error: Error | unknown, context?: any) {
  console.error('[error]', scope, error, context)
  // TODO: D14 接入 Sentry 或类似服务
}
