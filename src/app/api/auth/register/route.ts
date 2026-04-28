import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PWD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 })
    }
    const normEmail = String(email).trim().toLowerCase()
    if (!EMAIL_RE.test(normEmail)) {
      return NextResponse.json({ error: '邮箱格式错误' }, { status: 400 })
    }
    if (!PWD_RE.test(password)) {
      return NextResponse.json({ error: '密码必须 8 位以上且含字母与数字' }, { status: 400 })
    }
    const exists = await prisma.user.findUnique({ where: { email: normEmail } })
    if (exists) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email: normEmail,
        passwordHash,
        credits: 100,
      },
    })
    return NextResponse.json({ id: user.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '注册失败' }, { status: 500 })
  }
}