import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  const { code } = await request.json()

  // 提供 Fallback 避免服务器 .env 未配置时校验失败
  const expectedCode = (process.env.INVITE_CODE || 'GAMBIT2026').trim().toUpperCase()

  if (code?.trim().toUpperCase() !== expectedCode) {
    return NextResponse.json({ error: '邀请码错误' }, { status: 401 })
  }

  const sessionId = randomUUID()

  // ✨ Day 1 收尾：邀请码通过时同时建 User 记录，
  // sessionId 同时作为 cookie 值和 User.id —— 这样后续
  // Workspace.userId = cookie 值时不会再触发外键违约
  try {
    await prisma.user.create({
      data: {
        id: sessionId,
        credits: 100, // 注册赠送 100 积分
      },
    })
  } catch (err) {
    // 忽略 — 极小概率 UUID 冲突或 Prisma 暂时性失败
    // 不阻塞登录流程
    console.error('[auth/verify] user create failed (non-fatal)', err)
  }

  const res = NextResponse.json({ success: true })

  res.cookies.set('gambit_invite', sessionId, {
    httpOnly: true,
    secure: false, // 允许 http 访问
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 天免重新输入
    path: '/',
  })

  return res
}
