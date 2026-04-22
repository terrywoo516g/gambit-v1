'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ModelOutput = {
  model: string
  content: string
}

const MODEL_COLORS: Record<string, string> = {
  'DeepSeek V3.2': 'bg-blue-500',
  'DeepSeek R1': 'bg-blue-600',
  'Kimi K2.6': 'bg-purple-500',
  'Kimi K2.5': 'bg-purple-500',
  'GLM 5.1': 'bg-green-500',
  'GLM 5': 'bg-green-500',
  '豆包 Seed 2.0 Pro': 'bg-orange-500',
  '豆包 Seed 2.0 Mini': 'bg-orange-400',
  'Qwen3 Max': 'bg-cyan-500',
  'Qwen3.5 Plus': 'bg-cyan-600',
  'MiniMax M2.7': 'bg-pink-500',
  'MiniMax M1': 'bg-pink-400',
}

function getTabColor(model: string) {
  return MODEL_COLORS[model] || 'bg-gray-500'
}

export default function ComposeScenePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([])
  const [activeTab, setActiveTab] = useState(0)

  // 右侧结构化模板
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateStructure, setTemplateStructure] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateExtra, setTemplateExtra] = useState('')

  const [generating, setGenerating] = useState(false)
  const [finalDraft, setFinalDraft] = useState<string | null>(null)

  useEffect(() => {
    if (!wsId) return
    async function init() {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspaces/${wsId}/scenes/compose/init`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSceneId(data.sceneSessionId)

        // 从 paragraphs 还原每个模型的完整输出
        const outputMap = new Map<string, string[]>()
        for (const p of data.paragraphs) {
          if (!outputMap.has(p.model)) outputMap.set(p.model, [])
          outputMap.get(p.model)!.push(p.text)
        }
        const outputs: ModelOutput[] = []
        for (const name of data.modelNames) {
          const parts = outputMap.get(name)
          if (parts) {
            outputs.push({ model: name, content: parts.join('\n\n') })
          }
        }
        setModelOutputs(outputs)
      } catch (e) {
        alert(e instanceof Error ? e.message : '初始化失败')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [wsId])

  // "以 XX 为底稿" — 将整篇内容填入正文区
  function applyAsBase(output: ModelOutput) {
    setTemplateBody(output.content)
  }

  async function handleGenerate() {
    if (!sceneId) return

    const hasContent = templateTitle.trim() || templateStructure.trim() || templateBody.trim()
    if (!hasContent) {
      alert('请至少在一个栏位中粘贴内容')
      return
    }

    // 保存选择
    await fetch(`/api/scenes/${sceneId}/selections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        starred: [],
        editedRows: {
          title: templateTitle,
          structure: templateStructure,
          body: templateBody,
          extra: templateExtra,
        },
      }),
    })

    try {
      setGenerating(true)
      const res = await fetch(`/api/scenes/${sceneId}/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFinalDraft(data.content)
    } catch (e) {
      alert(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-inkLight text-sm">正在加载素材...</p>
        </div>
      </div>
    )
  }

  // 生成最终稿后的视图：左右对比
  if (finalDraft) {
    return (
      <div className="min-h-screen blueprint-grid flex flex-col">
        <header className="h-14 border-b border-black/5 flex items-center justify-between px-6 bg-paper/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/workspace/' + wsId)} className="text-inkLight hover:text-accent text-sm">← 返回工作台</button>
            <span className="font-semibold text-ink text-sm">📝 创意合成 — 最终稿</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFinalDraft(null)}
              className="text-sm text-inkLight hover:text-accent border border-gray-200 px-3 py-1.5 rounded-lg">
              返回编辑
            </button>
            <button onClick={() => navigator.clipboard.writeText(finalDraft)}
              className="text-sm bg-accent text-white px-4 py-1.5 rounded-lg hover:bg-accent/90">
              复制全文
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-8">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalDraft}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen blueprint-grid flex flex-col">
      {/* 顶栏 */}
      <header className="h-14 border-b border-black/5 flex items-center justify-between px-6 bg-paper/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workspace/' + wsId)} className="text-inkLight hover:text-accent text-sm">← 返回工作台</button>
          <span className="font-semibold text-ink text-sm">📝 创意合成</span>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">
          {generating ? '合成中...' : '✨ 创意合成'}
        </button>
      </header>

      {/* 提示条 */}
      <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
        💡 操作方式：在左侧选中喜欢的文字 → 复制（Ctrl+C）→ 粘贴到右侧对应栏位（Ctrl+V）→ 点击「创意合成」
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* ===== 左侧：AI 原文浏览区 ===== */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          {/* 模型 Tab 切换 */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-gray-100 bg-white/50">
            {modelOutputs.map((output, idx) => (
              <button
                key={output.model}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === idx
                    ? 'bg-ink text-white'
                    : 'bg-gray-100 text-inkLight hover:bg-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${getTabColor(output.model)}`} />
                {output.model}
              </button>
            ))}
          </div>

          {/* "以此为底稿"按钮 */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={() => modelOutputs[activeTab] && applyAsBase(modelOutputs[activeTab])}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-accent hover:text-accent transition text-inkLight"
            >
              📋 以 {modelOutputs[activeTab]?.model} 的全文为底稿
            </button>
          </div>

          {/* 原文内容 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 select-text">
            {modelOutputs[activeTab] && (
              <div className="prose prose-sm max-w-none text-ink">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  p: ({children}) => <p className="my-2 leading-relaxed">{children}</p>,
                  h1: ({children}) => <h1 className="text-lg font-bold my-3">{children}</h1>,
                  h2: ({children}) => <h2 className="text-base font-bold my-2">{children}</h2>,
                  h3: ({children}) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                  ul: ({children}) => <ul className="list-disc pl-4 my-2">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-4 my-2">{children}</ol>,
                  li: ({children}) => <li className="leading-relaxed my-0.5">{children}</li>,
                  strong: ({children}) => <strong className="font-semibold text-ink">{children}</strong>,
                  code: ({children}) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                  blockquote: ({children}) => <blockquote className="border-l-2 border-gray-300 pl-3 my-2 text-inkLight italic">{children}</blockquote>,
                }}>{modelOutputs[activeTab].content}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* ===== 右侧：结构化模板区 ===== */}
        <div className="w-1/2 flex flex-col bg-gray-50/30">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-ink">合成模板</h3>
            <p className="text-xs text-inkLight mt-0.5">把你喜欢的内容粘贴到对应栏位</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {/* 栏位 1：标题 */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5">
                <span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">1</span>
                标题
              </label>
              <input
                value={templateTitle}
                onChange={e => setTemplateTitle(e.target.value)}
                placeholder="粘贴或输入你喜欢的标题..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white"
              />
            </div>

            {/* 栏位 2：核心思想/结构 */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5">
                <span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">2</span>
                核心思想 / 结构框架
              </label>
              <textarea
                value={templateStructure}
                onChange={e => setTemplateStructure(e.target.value)}
                placeholder="粘贴你喜欢的内容结构、大纲、核心论点...&#10;&#10;例如：先用痛点开头 → 产品介绍 → 使用体验 → 总结推荐"
                className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y"
              />
            </div>

            {/* 栏位 3：正文内容 */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5">
                <span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">3</span>
                正文内容 / 精彩片段
              </label>
              <textarea
                value={templateBody}
                onChange={e => setTemplateBody(e.target.value)}
                placeholder="粘贴你喜欢的段落、金句、具体描述...&#10;&#10;可以从不同 AI 的输出中各取所长"
                className="w-full min-h-[200px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y"
              />
            </div>

            {/* 栏位 4：补充要求 */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5">
                <span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-xs">+</span>
                补充要求（可选）
              </label>
              <textarea
                value={templateExtra}
                onChange={e => setTemplateExtra(e.target.value)}
                placeholder="对最终稿的额外要求，如风格、字数、语气...&#10;&#10;例如：用轻松活泼的语气，控制在 500 字以内，多用 emoji"
                className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y"
              />
            </div>
          </div>

          {/* 底部操作区 */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
            <div className="text-xs text-inkLight">
              {[templateTitle, templateStructure, templateBody].filter(Boolean).length}/3 个栏位已填写
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">
              {generating ? '合成中...' : '✨ 创意合成'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
