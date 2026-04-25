'use client'
import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    if (res.ok) {
      window.location.href = '/workspaces'
    } else {
      setError('邀请码错误，请确认后重试')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm">
        <div className="w-10 h-10 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Gambit</h1>
        <p className="text-gray-400 text-sm text-center mb-8">多模型 AI 工作台 · 内测版</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="输入内测邀请码"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-center tracking-widest font-mono outline-none focus:border-blue-400 transition-colors"
            maxLength={20}
            autoFocus
            required
          />
          {error && (
            <p className="text-red-500 text-xs text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !code}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <><ArrowRight size={15} />进入工作台</>
            }
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">向团队获取内测邀请码</p>
      </div>
    </div>
  )
}
