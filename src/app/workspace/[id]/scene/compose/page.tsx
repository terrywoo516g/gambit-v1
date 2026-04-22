'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Paragraph = { id: string; model: string; text: string; index: number }

const MODEL_COLORS: Record<string, string> = {
  'DeepSeek V3.2': 'border-blue-300 bg-blue-50',
  'DeepSeek R1': 'border-blue-400 bg-blue-50',
  'Kimi K2.6': 'border-purple-300 bg-purple-50',
  'Kimi K2.5': 'border-purple-300 bg-purple-50',
  'GLM 5.1': 'border-green-300 bg-green-50',
  'GLM 5': 'border-green-300 bg-green-50',
  '豆包 Seed 2.0 Pro': 'border-orange-300 bg-orange-50',
  '豆包 Seed 2.0 Mini': 'border-orange-200 bg-orange-50',
}

function getColor(model: string) {
  return MODEL_COLORS[model] || 'border-gray-300 bg-gray-50'
}

export default function ComposeScenePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([])
  const [modelNames, setModelNames] = useState<string[]>([])
  const [filterModel, setFilterModel] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [selectedParagraphs, setSelectedParagraphs] = useState<Paragraph[]>([])
  const [customText, setCustomText] = useState('')

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
        setParagraphs(data.paragraphs)
        setModelNames(data.modelNames)
      } catch (e) {
        alert(e instanceof Error ? e.message : '初始化失败')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [wsId])

  function addParagraph(p: Paragraph) {
    if (selectedParagraphs.find(s => s.id === p.id)) return
    setSelectedParagraphs(prev => [...prev, p])
  }

  function removeParagraph(id: string) {
    setSelectedParagraphs(prev => prev.filter(p => p.id !== id))
  }

  function moveParagraph(idx: number, dir: -1 | 1) {
    const newArr = [...selectedParagraphs]
    const target = idx + dir
    if (target < 0 || target >= newArr.length) return
    ;[newArr[idx], newArr[target]] = [newArr[target], newArr[idx]]
    setSelectedParagraphs(newArr)
  }

  function applyBaseModel(model: string) {
    const modelParas = paragraphs.filter(p => p.model === model)
    setSelectedParagraphs(modelParas)
  }

  async function handleGenerate() {
    if (!sceneId) return
    // 保存选择
    await fetch(`/api/scenes/${sceneId}/selections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        starred: selectedParagraphs.map(p => p.id),
        editedRows: { title, customText, paragraphTexts: selectedParagraphs.map(p => p.text) },
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

  const filteredParagraphs = filterModel
    ? paragraphs.filter(p => p.model === filterModel)
    : paragraphs

  if (loading) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-inkLight text-sm">正在切分段落...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen blueprint-grid flex flex-col">
      <header className="h-14 border-b border-black/5 flex items-center justify-between px-6 bg-paper/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workspace/' + wsId)} className="text-inkLight hover:text-accent text-sm">← 返回工作台</button>
          <span className="font-semibold text-ink text-sm">📝 创意合成</span>
        </div>
        <button onClick={handleGenerate} disabled={generating || selectedParagraphs.length === 0}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">
          {generating ? '合成中...' : '生成最终稿'}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：素材库 */}
        <div className="w-2/5 border-r border-gray-200 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">素材库</h3>
            <div className="flex gap-1">
              <button onClick={() => setFilterModel(null)}
                className={`text-xs px-2 py-1 rounded ${!filterModel ? 'bg-accent text-white' : 'bg-gray-100 text-inkLight'}`}>全部</button>
              {modelNames.map(m => (
                <button key={m} onClick={() => setFilterModel(m)}
                  className={`text-xs px-2 py-1 rounded ${filterModel === m ? 'bg-accent text-white' : 'bg-gray-100 text-inkLight'}`}>
                  {m.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* 一键以某 AI 为底稿 */}
          <div className="flex gap-2 mb-3">
            {modelNames.map(m => (
              <button key={m} onClick={() => applyBaseModel(m)}
                className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:border-accent text-inkLight">
                以 {m.split(' ')[0]} 为底稿
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredParagraphs.map(p => {
              const isSelected = selectedParagraphs.some(s => s.id === p.id)
              return (
                <div key={p.id}
                  onClick={() => !isSelected && addParagraph(p)}
                  className={`border rounded-lg p-3 cursor-pointer transition text-sm ${
                    isSelected ? 'opacity-40 cursor-not-allowed border-gray-200' : getColor(p.model) + ' hover:shadow-sm'
                  }`}>
                  <div className="text-xs text-inkLight mb-1">{p.model}</div>
                  <div className="text-ink line-clamp-3">{p.text}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 中栏：编辑区 */}
        <div className={`overflow-y-auto p-4 ${finalDraft ? 'w-2/5' : 'w-3/5'}`}>
          <h3 className="text-sm font-semibold text-ink mb-3">合成编辑器</h3>

          <div className="mb-4">
            <label className="text-xs text-inkLight block mb-1">标题</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="输入最终稿标题..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent" />
          </div>

          <div className="mb-4">
            <label className="text-xs text-inkLight block mb-1">
              已选段落（{selectedParagraphs.length}）— 点击左侧段落添加，拖拽排序
            </label>
            {selectedParagraphs.length === 0 ? (
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-inkLight">
                点击左侧的段落添加到这里
              </div>
            ) : (
              <div className="space-y-2">
                {selectedParagraphs.map((p, idx) => (
                  <div key={p.id} className={`border rounded-lg p-3 ${getColor(p.model)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-inkLight">{p.model}</span>
                      <div className="flex gap-1">
                        <button onClick={() => moveParagraph(idx, -1)} className="text-xs text-inkLight hover:text-accent">↑</button>
                        <button onClick={() => moveParagraph(idx, 1)} className="text-xs text-inkLight hover:text-accent">↓</button>
                        <button onClick={() => removeParagraph(p.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                      </div>
                    </div>
                    <div className="text-sm text-ink">{p.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="text-xs text-inkLight block mb-1">补充内容（可选）</label>
            <textarea value={customText} onChange={e => setCustomText(e.target.value)}
              placeholder="写下你想补充的内容、要求或风格说明..."
              className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent" />
          </div>
        </div>

        {/* 右栏：最终稿 */}
        {finalDraft && (
          <div className="w-1/3 border-l border-gray-200 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">最终稿</h3>
              <button onClick={() => navigator.clipboard.writeText(finalDraft)}
                className="text-xs text-inkLight hover:text-accent">复制全文</button>
            </div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalDraft}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
