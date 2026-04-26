'use client'

import * as React from 'react'
import { Copy } from 'lucide-react'

interface FinalDraftPanelProps {
  workspaceId: string
  workspace?: any
  allDone?: boolean
}

export default function FinalDraftPanel({ allDone }: FinalDraftPanelProps) {
  // 防御式编程：安全地读取上游状态
  const isAllDone = allDone ?? false
  
  // P0 不接入真实文稿生成，先固定没有草稿
  const hasDraft = false 

  // 根据 allDone 切换顶部状态
  const statusText = hasDraft 
    ? "已生成文稿" 
    : isAllDone 
      ? "可生成分析" 
      : "等待模型回答"

  const statusColor = hasDraft 
    ? "bg-green-500" 
    : isAllDone 
      ? "bg-blue-500" 
      : "bg-gray-400"

  const statusBg = hasDraft
    ? "bg-green-50 text-green-700 border-green-200"
    : isAllDone
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-gray-50 text-gray-600 border-gray-200"

  return (
    <div className="flex flex-col h-full bg-gray-50 w-full overflow-hidden">
      {/* 区域 1：状态指示条（顶部） */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 shrink-0 flex items-center">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors duration-300 ${statusBg}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
          {statusText}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col p-4 gap-6">
        {/* 区域 2：综合判断区 */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-3">综合判断</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-h-[100px] flex items-center justify-center">
            <span className="text-sm text-gray-400 text-center leading-relaxed">
              等待多模型回答完成后，Gambit 将提炼核心判断。
            </span>
          </div>
        </section>

        {/* 区域 3：四维分析区 */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: '共识', id: 'consensus' },
              { title: '分歧', id: 'divergence' },
              { title: '少数派', id: 'minority' },
              { title: '待验证', id: 'unverified' }
            ].map(item => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col h-[100px]">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-bold text-gray-800">{item.title}</h3>
                  <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-mono">0</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-gray-400">暂无内容</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 区域 4：轻量文稿区 */}
        <section className="flex-1 flex flex-col min-h-[160px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">轻量文稿</h2>
            <button 
              disabled
              className="p-1.5 text-gray-400 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              title="复制内容"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <span className="text-sm text-gray-400 text-center leading-relaxed">
              Reflection 完成后，将自动生成简版文稿。
            </span>
          </div>
        </section>
      </div>

      {/* 区域 5：操作区（底部） */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0 flex flex-col gap-2.5">
        <button 
          onClick={() => console.log('生成报告预览 clicked')}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          生成报告预览
        </button>
        <button 
          onClick={() => console.log('深化定制输出 clicked')}
          className="w-full py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white border border-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          深化定制输出
        </button>
      </div>
    </div>
  )
}
