'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tier } from '@/lib/payment/tiers'

type CreatedOrder = {
  orderId: string
  qrCodeUrl: string
  amountCents: number
  credits: number
  expiresAt: string
}

export default function RechargeClient({
  tiers,
  isMock,
}: {
  tiers: Tier[]
  isMock: boolean
}) {
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [status, setStatus] = useState<'idle' | 'creating' | 'pending' | 'paid' | 'expired' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const tickRef = useRef<NodeJS.Timeout | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const secondsLeft = useMemo(() => {
    if (!order) return 0
    const ms = new Date(order.expiresAt).getTime() - now
    return Math.max(0, Math.floor(ms / 1000))
  }, [order, now])

  async function createOrder(tierId: string) {
    setError(null)
    setStatus('creating')
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'create failed')
      const data = (await res.json()) as CreatedOrder
      setOrder(data)
      setStatus('pending')
      startPolling(data.orderId)
      startTicking()
    } catch (e: any) {
      setError(e.message)
      setStatus('idle')
    }
  }

  function startTicking() {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
  }

  function stopTicking() {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
  }

  function startPolling(orderId: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/orders/${orderId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'paid') {
          setStatus('paid')
          window.dispatchEvent(new CustomEvent('credits:changed'))
          clearInterval(pollRef.current!)
          pollRef.current = null
          stopTicking()
        } else if (data.status === 'expired' || data.status === 'failed') {
          setStatus(data.status)
          clearInterval(pollRef.current!)
          pollRef.current = null
          stopTicking()
        }
      } catch {}
    }, 3000)
  }

  async function simulateSuccess() {
    if (!order) return
    await fetch('/api/payments/callback/mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.orderId,
        providerOrderId: `mock_${order.orderId}`,
        amountCents: order.amountCents,
      }),
    })
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-ink">积分充值</h1>

      {!order && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tiers.map(t => (
            <button
              key={t.id}
              onClick={() => createOrder(t.id)}
              disabled={status === 'creating'}
              className="border border-gray-200 bg-white rounded-lg p-4 hover:border-accent transition-colors text-left disabled:opacity-50"
            >
              <div className="font-semibold text-ink">{t.label}</div>
              <div className="text-xs text-inkLight mt-1">立即到账，支持多次购买</div>
            </button>
          ))}
        </div>
      )}

      {error && <div className="mt-4 text-red-600">{error}</div>}

      {order && status !== 'paid' && (
        <div className="mt-6 border border-gray-200 bg-white rounded-lg p-6 text-center">
          <div className="mb-2 text-sm text-ink">
            订单 {order.orderId.slice(-8)} · ¥{(order.amountCents / 100).toFixed(2)} · {order.credits} 积分
          </div>
          <div className="text-xs text-inkLight mb-4">
            扫码支付（{secondsLeft}s 后过期）
          </div>
          <div className="bg-gray-50 border border-gray-200 h-48 flex items-center justify-center mb-4 break-all px-4 rounded">
            <span className="text-xs text-gray-400">{order.qrCodeUrl}</span>
          </div>

          {status === 'expired' && <div className="text-orange-600">订单已过期</div>}
          {status === 'failed' && <div className="text-red-600">订单失败</div>}

          {isMock && status === 'pending' && (
            <button
              onClick={simulateSuccess}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded transition-colors"
            >
              [mock] 模拟支付成功
            </button>
          )}
        </div>
      )}

      {order && status === 'paid' && (
        <div className="mt-6 border-2 border-green-500 bg-white rounded-lg p-6 text-center">
          <div className="text-green-600 text-xl font-bold mb-2">✓ 支付成功</div>
          <div className="text-ink">已到账 {order.credits} 积分</div>
          <a href="/workspaces" className="inline-block mt-4 bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded transition-colors">
            返回工作台
          </a>
        </div>
      )}
    </div>
  )
}
