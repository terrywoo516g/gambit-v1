import crypto from 'crypto'
import type { CallbackVerifyParams, CallbackVerifyResult, CreatePaymentParams, CreatePaymentResult, PaymentProvider } from '../types'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function randomNonce() {
  return crypto.randomBytes(16).toString('hex')
}

export function huipijiaoSign(params: Record<string, string>, appSecret: string): string {
  const keys = Object.keys(params)
    .filter((key) => key !== 'hash' && params[key] !== '' && params[key] !== undefined && params[key] !== null)
    .sort()
  const queryString = keys.map((key) => `${key}=${params[key]}`).join('&')
  const signString = queryString + appSecret
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex').toLowerCase()
}

export function huipijiaoVerifyHash(body: Record<string, string>, appSecret: string): boolean {
  const claimed = body.hash
  if (!claimed) return false
  const computed = huipijiaoSign(body, appSecret)
  const a = Buffer.from(claimed)
  const b = Buffer.from(computed)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export const huipijiaoProvider: PaymentProvider = {
  name: 'huipijiao',

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const appid = requireEnv('HUIPIJIAO_APP_ID')
    const appSecret = requireEnv('HUIPIJIAO_APP_SECRET')
    const gatewayUrl = requireEnv('HUIPIJIAO_GATEWAY_URL')

    const payload: Record<string, string> = {
      version: '1.1',
      lang: 'zh-cn',
      plugins: 'gambit-nextjs',
      appid,
      trade_order_id: params.orderId,
      total_fee: (params.amountCents / 100).toFixed(2),
      title: params.description,
      time: String(Math.floor(Date.now() / 1000)),
      notify_url: params.notifyUrl,
      return_url: params.returnUrl || '',
      nonce_str: randomNonce(),
    }
    payload.hash = huipijiaoSign(payload, appSecret)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const res = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      const data = (await res.json()) as { url?: string; oid?: string; errcode?: number | string; errmsg?: string }
      // 虎皮椒下单响应按文档读取 url/oid/errcode/errmsg。
      if (!res.ok || (data.errcode !== undefined && String(data.errcode) !== '0') || !data.url) {
        throw new Error(`huipijiao create failed: errcode=${data.errcode ?? res.status}, errmsg=${data.errmsg ?? 'unknown'}`)
      }
      return { payUrl: data.url, providerOrderId: data.oid, raw: data }
    } catch (error) {
      if (error instanceof Error) throw error
      throw new Error('huipijiao create failed')
    } finally {
      clearTimeout(timeout)
    }
  },

  async verifyCallback({ body }: CallbackVerifyParams): Promise<CallbackVerifyResult> {
    const appid = requireEnv('HUIPIJIAO_APP_ID')
    const appSecret = requireEnv('HUIPIJIAO_APP_SECRET')

    if (!huipijiaoVerifyHash(body, appSecret)) return { ok: false, reason: 'hash_invalid' }
    if (body.appid !== appid) return { ok: false, reason: 'appid_mismatch' }
    if (body.status !== 'OD') return { ok: false, reason: 'status_not_paid' }

    const amount = Number.parseFloat(body.total_fee || '')
    if (!body.trade_order_id || !Number.isFinite(amount)) {
      return { ok: false, reason: 'invalid_payload' }
    }

    return {
      ok: true,
      orderId: body.trade_order_id,
      amountCents: Math.round(amount * 100),
      providerOrderId: body.open_order_id || body.oid,
    }
  },

  successResponseText() {
    return 'success'
  },
}
