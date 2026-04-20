'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleNewWorkspace() {
    try {
      setLoading(true)
      
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新工作台', mode: 'chat' }),
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
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Nav Bar */}
      <nav className="bg-[#0f1117] border-b border-white/10 px-8 h-14 fixed top-0 w-full z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/mascot.png" width={32} height={32} alt="Gambit" className="rounded-full" />
          <span className="font-bold text-white">Gambit</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/workspaces" className="text-slate-400 hover:text-white text-sm font-medium">
            历史工作台
          </a>
          <button
            onClick={handleNewWorkspace}
            disabled={loading}
            className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            {loading ? '创建中...' : '开始使用'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-14 px-8 bg-gradient-to-br from-[#0f1117] to-[#1a1f2e]">
        <div className="max-w-7xl mx-auto w-full flex flex-col items-center gap-12">
          <div className="flex-1 w-full text-center md:text-left md:w-auto md:items-start md:flex md:flex-row md:justify-between">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                重要决定<br />
                不该只听一个 AI 的
              </h1>
              <p className="text-slate-400 text-lg mt-4 max-w-md mx-auto md:mx-0">
                Gambit 让多个顶级 AI 同时分析你的问题，给出不同角度的回答，再由专业 AI 综合出最优解。
              </p>
              <button
                onClick={handleNewWorkspace}
                disabled={loading}
                className="mt-8 bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-xl text-base font-medium transition mx-auto md:mx-0 md:inline-block"
              >
                {loading ? '创建中...' : '开始第一次对话 →'}
              </button>
            </div>
            <div className="flex-shrink-0">
              <div className="drop-shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                <Image src="/mascot.png" width={180} height={180} alt="Gambit" className="md:w-72 md:h-72" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-[#0f1117] py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            四位 AI 专家，各司其职
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-xl font-semibold text-white mb-2">分歧官</h3>
              <p className="text-slate-400 text-sm">
                激进/稳健/务实三派同步出招，呈现决策的完整可能性
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition">
              <div className="text-3xl mb-3">🧩</div>
              <h3 className="text-xl font-semibold text-white mb-2">合成官</h3>
              <p className="text-slate-400 text-sm">
                DeepSeek-R1 综合多方意见，给出有依据的最优建议
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="text-xl font-semibold text-white mb-2">审稿官</h3>
              <p className="text-slate-400 text-sm">
                从逻辑结构和文字表达两个维度深度审阅你的文章
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition">
              <div className="text-3xl mb-3">⚖️</div>
              <h3 className="text-xl font-semibold text-white mb-2">比稿官</h3>
              <p className="text-slate-400 text-sm">
                两段内容对比分析，精准指出优劣，直接推荐选择
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#13161e] py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">
            三步完成一次决策
          </h2>
          <div className="flex flex-col md:flex-row justify-center gap-16">
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="bg-indigo-500/20 text-indigo-400 w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">描述问题</h3>
              <p className="text-slate-400 text-sm">
                输入你的问题或粘贴文章，选择需要哪位专家
              </p>
            </div>
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="bg-indigo-500/20 text-indigo-400 w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">多AI并行分析</h3>
              <p className="text-slate-400 text-sm">
                Kimi、GLM、豆包、DeepSeek 同时给出独立判断
              </p>
            </div>
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="bg-indigo-500/20 text-indigo-400 w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">综合出最优解</h3>
              <p className="text-slate-400 text-sm">
                合成官整合所有观点，给你一个有据可查的决策
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-indigo-600 py-20 text-center">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-3xl text-white font-bold">准备好了吗？</h2>
          <p className="text-white/80 mt-2">免费试用，无需注册</p>
          <button
            onClick={handleNewWorkspace}
            disabled={loading}
            className="mt-6 bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold transition hover:bg-white/90"
          >
            {loading ? '创建中...' : '立即开始'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f1117] py-10 text-center text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-8">
          © 2026 Gambit · 重要决定，不该只听一个AI的
        </div>
      </footer>
    </div>
  )
}