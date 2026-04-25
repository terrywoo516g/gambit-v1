import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  const { code } = await request.json()

  // 提供 Fallback 避免服务器 .env 未配置时校验失败
  const expectedCode = process.env.INVITE_CODE || 'GAMBIT2026'

  if (code?.trim().toUpperCase() !== expectedCode) {
    return NextResponse.json({ error: '邀请码错误' }, { status: 401 })
  }

  const sessionId = randomUUID()
  const res = NextResponse.json({ success: true })

  res.cookies.set('gambit_invite', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 天免重新输入
    path: '/',
  })

  return res
}
