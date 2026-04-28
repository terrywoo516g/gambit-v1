'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Copy, RefreshCw } from 'lucide-react'
import { Reflection } from '@/lib/reflection/types'

interface FinalDraftPanelProps {
  workspaceId: string
  workspace?: any
  allDone?: boolean
  reflection?: Reflection | null
  reflectionStatus?: 'idle' | 'loading' | 'success' | 'error'
  reflectionError?: string | null
  onRetryReflection?: () => void
  headerRight?: React.ReactNode
}

const MOCK_REFLECTION = {
  summary: "三个模型在「996 是否合理」这个问题上观点存在显著分歧。共识在于法律边界明确（违反《劳动法》），但在「特定行业是否存在合理性」上分歧明显。",
  
  dimensions: {
    consensus: [
      { id: "c1", text: "996 工作制超过《劳动法》规定的工时上限，在法律上不合规" },
      { id: "c2", text: "长期高强度工作对员工健康有明确负面影响" },
      { id: "c3", text: "高效企业应通过流程优化而非延长工时来获得竞争力" },
    ],
    
    divergence: [
      { id: "d1", text: "互联网/创业初期阶段是否构成「合理」的特殊情境（DeepSeek 倾向认可，Qwen 完全否认）" },
      { id: "d2", text: "员工自愿加班的法律意义（MiniMax 强调即使自愿也违法，Qwen 认为应区分场景）" },
    ],
    
    minority: [
      { id: "m1", text: "Qwen 提到「保留考勤记录、工资条作为维权证据」这个具体可执行建议，其他两个模型未提及" },
    ],
    
    pending: [
      { id: "p1", text: "「特定行业项目周期紧」是否真的需要 996 强度，还是管理失败的借口（缺乏行业数据支撑）" },
      { id: "p2", text: "现行劳动监察的实际执行力度（涉及具体地区差异，无法在模型内确定）" },
    ],
  },
  
  draft: "关于「996 在某些行业是否合理」这个问题，三个模型的回答呈现出明确的法律共识与情境分歧：\n\n所有模型都同意，从法律层面看 996 工作制违反《劳动法》对工时的规定，企业以「自愿加班」为由也无法规避法律责任。同时，长期高强度工作对员工健康的负面影响在医学层面有充分证据。\n\n但在「行业特殊性是否构成合理性」这一点上，模型间存在分歧。一种观点认为互联网、金融等高竞争行业的早期阶段，存在事实上的高强度工作现象；另一种观点则认为任何形式的违法加班都不应被「行业特殊性」合理化。\n\n建议关注：保留考勤记录和工资条作为维权依据；在评估工作机会时综合考虑职业发展、薪酬福利与工作强度；如遇违法加班可向劳动监察部门投诉。",
};

function DimensionCard({ title, items, loading }: { title: string, items: { id: string, text: string }[], loading?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col h-full min-h-[100px]">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-bold text-gray-800">{title}</h3>
        <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{loading ? '-' : items.length}</span>
      </div>
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col gap-2 mt-2">
            <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-2 w-4/5 bg-gray-100 rounded animate-pulse" />
            <div className="h-2 w-5/6 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-xs text-gray-400">暂无内容</span>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <ul className="text-xs text-gray-600 space-y-1.5 flex-1">
              {displayItems.map(item => (
                <li key={item.id} className="flex items-start gap-1.5">
                  <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                  <span className="leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
            {hasMore && !expanded && (
              <button 
                onClick={() => setExpanded(true)}
                className="mt-2 text-[10px] text-blue-500 hover:text-blue-600 font-medium self-start transition-colors"
              >
                展开更多 ↓
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FinalDraftPanel({ 
  workspaceId,
  allDone,
  reflection,
  reflectionStatus = 'idle',
  reflectionError,
  onRetryReflection,
  headerRight
}: FinalDraftPanelProps) {
  const [isMockMode, setIsMockMode] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMock = new URLSearchParams(window.location.search).get('mockReflection') === '1'
      setIsMockMode(isMock)
    }
  }, [])

  const isAllDone = allDone ?? false
  
  // 根据 mockMode / reflectionStatus / allDone 切换顶部状态
  let statusText = "等待模型回答"
  let statusColor = "bg-gray-400"
  let statusBg = "bg-gray-50 text-gray-600 border-gray-200"

  if (isMockMode) {
    statusText = "已生成分析（DEMO）"
    statusColor = "bg-green-500"
    statusBg = "bg-green-50 text-green-700 border-green-200"
  } else if (isAllDone) {
    if (reflectionStatus === 'success') {
      statusText = "已生成分析"
      statusColor = "bg-green-500"
      statusBg = "bg-green-50 text-green-700 border-green-200"
    } else if (reflectionStatus === 'loading') {
      statusText = "生成分析中…"
      statusColor = "bg-blue-400 animate-pulse"
      statusBg = "bg-blue-50 text-blue-600 border-blue-200"
    } else if (reflectionStatus === 'error') {
      statusText = "分析生成失败"
      statusColor = "bg-red-500"
      statusBg = "bg-red-50 text-red-600 border-red-200"
    } else {
      statusText = "可生成分析"
      statusColor = "bg-blue-500"
      statusBg = "bg-blue-50 text-blue-700 border-blue-200"
    }
  }

  const handleCopy = () => {
    const textToCopy = isMockMode ? MOCK_REFLECTION.draft : reflection?.draft
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
        .catch(err => console.error('Failed to copy text: ', err))
    }
  }

  const isLoading = reflectionStatus === 'loading' && !isMockMode
  const isError = reflectionStatus === 'error' && !isMockMode
  const isSuccess = reflectionStatus === 'success' && !isMockMode

  const currentSummary = isMockMode 
    ? MOCK_REFLECTION.summary 
    : (isSuccess && reflection ? reflection.summary : null)
    
  const currentDimensions = isMockMode
    ? MOCK_REFLECTION.dimensions
    : (isSuccess && reflection ? reflection.dimensions : null)

  return (
    <div className="flex flex-col h-full bg-gray-50 w-[400px] overflow-visible">
      {/* 区域 1：状态指示条（顶部） */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors duration-300 ${statusBg} shrink-0`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
            {statusText}
          </div>
          {isMockMode && (
            <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0">
              DEMO 数据
            </span>
          )}
        </div>
        {headerRight && (
          <div className="flex items-center ml-auto pl-2 shrink-0">
            {headerRight}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col p-4 gap-6">
        {/* 区域 2：综合判断区 */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-3">综合判断</h2>
          <div className={`bg-white border ${isError ? 'border-red-200' : 'border-gray-200'} rounded-xl p-4 shadow-sm min-h-[100px] flex items-center justify-center`}>
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
                <span className="text-xs text-gray-400 mt-2">正在生成综合判断…</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-red-600">分析生成失败：{reflectionError || '未知错误'}</span>
                <button 
                  onClick={onRetryReflection}
                  className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> 重试
                </button>
              </div>
            ) : currentSummary ? (
              <span className="text-sm text-gray-700 leading-relaxed w-full">
                {currentSummary}
              </span>
            ) : (
              <span className="text-sm text-gray-400 text-center leading-relaxed">
                等待多模型回答完成后，Gambit 将提炼核心判断。
              </span>
            )}
          </div>
        </section>

        {/* 区域 3：四维分析区 */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            <DimensionCard 
              title="共识" 
              loading={isLoading}
              items={currentDimensions?.consensus ?? []} 
            />
            <DimensionCard 
              title="分歧" 
              loading={isLoading}
              items={currentDimensions?.divergence ?? []} 
            />
            <DimensionCard 
              title="少数派" 
              loading={isLoading}
              items={currentDimensions?.minority ?? []} 
            />
            <DimensionCard 
              title="待验证" 
              loading={isLoading}
              items={currentDimensions?.pending ?? []} 
            />
          </div>
        </section>

        {/* 区域 4：综合文稿区 */}
        <section className="flex-1 flex flex-col min-h-[160px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">综合文稿</h2>
            <div className="flex items-center gap-2">
              {copied && <span className="text-xs text-green-600 font-medium">已复制</span>}
              <button 
                disabled={!isMockMode && !isSuccess}
                onClick={handleCopy}
                className="p-1.5 text-gray-400 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                title="复制内容"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className={`flex-1 bg-white border ${isError ? 'border-red-200' : 'border-gray-200'} rounded-xl p-4 shadow-sm flex flex-col ${isMockMode || isSuccess ? '' : 'items-center justify-center'}`}>
            {isLoading ? (
              <div className="flex flex-col gap-3 w-full">
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <span className="text-sm text-red-600">文稿生成失败：{reflectionError || '未知错误'}</span>
                <button 
                  onClick={onRetryReflection}
                  className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> 重试
                </button>
              </div>
            ) : isMockMode ? (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {MOCK_REFLECTION.draft}
              </div>
            ) : isSuccess && reflection?.draft ? (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {reflection.draft}
              </div>
            ) : (
              <span className="text-sm text-gray-400 text-center leading-relaxed">
                Reflection 完成后，将自动生成综合文稿。
              </span>
            )}
          </div>
        </section>
      </div>

      {/* 区域 5：操作区（底部） */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0 flex flex-col gap-2.5">
        {(isSuccess && reflection?.draft) || isMockMode ? (
          <Link 
            href={`/report/${workspaceId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors text-center"
          >
            查看报告
          </Link>
        ) : (
          <button 
            disabled
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm transition-colors opacity-50 cursor-not-allowed"
            title="等待 reflection 完成后可查看报告"
          >
            查看报告
          </button>
        )}
        {(isSuccess && reflection?.draft) || isMockMode ? (
          <Link 
            href={`/report/${workspaceId}/customize`}
            className="w-full py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white border border-gray-200 rounded-lg text-sm font-medium transition-colors text-center"
          >
            深化定制输出
          </Link>
        ) : (
          <button 
            disabled
            className="w-full py-2 text-gray-600 bg-white border border-gray-200 rounded-lg text-sm font-medium transition-colors opacity-50 cursor-not-allowed"
            title="等待 reflection 完成后可进行深化定制"
          >
            深化定制输出
          </button>
        )}
      </div>
    </div>
  )
}
