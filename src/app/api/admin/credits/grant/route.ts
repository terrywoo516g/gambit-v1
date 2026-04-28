import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { grantCredits } from '@/lib/billing/credits'

function isAdmin(email?: string | null): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  
  const { email, amount, description } = body
  
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json({ error: 'amount must be a positive integer <= 1000000' }, { status: 400 })
  }
  
  const target = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (!target) {
    return NextResponse.json({ error: 'user not found' }, { status: 404 })
  }
  
  const newBalance = await grantCredits(
    target.id,
    amount,
    'admin_grant',
    description ?? undefined
  )
  
  return NextResponse.json({
    userId: target.id,
    email: target.email,
    newBalance,
  })
}