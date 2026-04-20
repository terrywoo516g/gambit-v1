'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { HomeInput } from '@/components/home/HomeInput'

export default function HomePage() {
  const router = useRouter()
  const [, setLoading] = useState(false)

  async function handleSubmit(text: string, mode: string) {
    try {
      setLoading(true)

      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 50), mode }),
      })

      if (!response.ok) {
        throw new Error('创建工作台失败')
      }

      const { workspace } = (await response.json()) as {
        workspace: { id: string }
      }

      router.push('/workspace/' + workspace.id)
    } catch (error) {
      alert(error instanceof Error ? error.message : '创建工作台失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <nav className="h-14 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/mascot.png" width={28} height={28} alt="Gambit" className="rounded-full" />
          <span className="font-semibold text-lg text-slate-900">Gambit</span>
        </div>
        <a href="/workspaces" className="text-sm text-slate-500 hover:text-slate-900 font-medium">
          历史工作台
        </a>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div className="w-full max-w-2xl flex flex-col items-center">
          {/* Mascot */}
          <div className="mb-4">
            <Image
              src="/mascot.png"
              width={180}
              height={180}
              alt="Gambit"
              className="w-[120px] h-[120px] md:w-[180px] md:h-[180px]"
              priority
            />
          </div>

          {/* Headline */}
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 text-center">
            重要决定，不该只听一个 AI 的
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-500 text-center">
            让多个 AI 从不同角度分析你的问题，综合出最优解
          </p>

          {/* Input */}
          <div className="mt-6 w-full">
            <HomeInput onSubmit={handleSubmit} />
          </div>
        </div>
      </main>
    </div>
  )
}
