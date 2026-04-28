'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { safeNext } from '@/lib/auth/safeNext'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('邮箱或密码错误')
      setLoading(false)
    } else {
      const nextUrl = safeNext(searchParams.get('next'))
      router.push(nextUrl)
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-sm p-8 bg-white border border-gray-200 rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold text-ink mb-6 text-center">登录 Gambit</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">邮箱</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">密码</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/register" className="text-accent hover:underline">
          注册账号
        </Link>
        <button disabled className="text-gray-400 cursor-not-allowed">
          忘记密码
        </button>
      </div>
    </div>
  )
}