'use client'

import { ReportConfig, DimensionKey, SectionKey, ReportTemplate, ReportTone } from '@/lib/report/types'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface ConfigPanelProps {
  config: ReportConfig
  onChange: (partial: Partial<ReportConfig>) => void
}

const TEMPLATES: { value: ReportTemplate; label: string; desc: string }[] = [
  { value: 'report', label: 'Report', desc: '3页正式报告' },
  { value: 'memo', label: 'Memo', desc: '1页简报' },
  { value: 'custom', label: 'Custom', desc: '自定义' }
]

const DIMENSIONS: { value: DimensionKey; label: string }[] = [
  { value: 'consensus', label: '共识' },
  { value: 'divergence', label: '分歧' },
  { value: 'minority', label: '少数派' },
  { value: 'pending', label: '待验证' }
]

const TONES: { value: ReportTone; label: string }[] = [
  { value: 'formal', label: '正式' },
  { value: 'plain', label: '通俗' },
  { value: 'academic', label: '学术' }
]

const ALL_SECTIONS: { value: SectionKey; label: string }[] = [
  { value: 'cover', label: '标题块' },
  { value: 'question', label: '原始问题块' },
  { value: 'conclusion', label: '综合判断块' },
  { value: 'dimensions', label: '四维分析块' },
  { value: 'draft', label: '综合文稿块' },
  { value: 'summary', label: '核心结论块' },
  { value: 'actions', label: '推荐行动块' },
  { value: 'metadata', label: '元信息块' }
]

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  
  const handleDimensionChange = (dim: DimensionKey) => {
    const isSelected = config.selectedDimensions.includes(dim)
    if (isSelected && config.selectedDimensions.length <= 1) {
      alert('至少保留 1 个分析维度')
      return
    }
    const newDims = isSelected 
      ? config.selectedDimensions.filter(d => d !== dim)
      : [...config.selectedDimensions, dim]
    onChange({ selectedDimensions: newDims })
  }

  const handleSectionToggle = (sec: SectionKey) => {
    const isEnabled = config.enabledSections.includes(sec)
    const newSections = isEnabled
      ? config.enabledSections.filter(s => s !== sec)
      : [...config.enabledSections, sec]
    onChange({ enabledSections: newSections })
  }

  const handleMoveSection = (sec: SectionKey, direction: 'up' | 'down') => {
    const idx = config.sectionOrder.indexOf(sec)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === config.sectionOrder.length - 1) return

    const newOrder = [...config.sectionOrder]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
    
    onChange({ sectionOrder: newOrder })
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-white border-r border-gray-200">
      
      {/* 1. 模板选择 */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <h3 className="text-sm font-bold text-ink mb-4">模板选择</h3>
        <div className="space-y-3">
          {TEMPLATES.map(t => (
            <label key={t.value} className="flex items-start gap-2 cursor-pointer group">
              <input 
                type="radio" 
                name="template" 
                value={t.value} 
                checked={config.template === t.value}
                onChange={() => onChange({ template: t.value })}
                className="mt-1 text-accent focus:ring-accent"
              />
              <div>
                <div className="text-sm font-medium text-ink">{t.label}</div>
                <div className="text-xs text-inkLight mt-0.5">{t.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 2. 标题自定义 */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <h3 className="text-sm font-bold text-ink mb-4">报告标题</h3>
        <input 
          type="text" 
          value={config.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="留空则使用工作区问题"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-accent transition-colors bg-gray-50"
        />
      </div>

      {/* 3. 维度筛选 */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <h3 className="text-sm font-bold text-ink mb-4">维度筛选</h3>
        <div className="space-y-2">
          {DIMENSIONS.map(d => {
            const isSelected = config.selectedDimensions.includes(d.value)
            const isLastOne = isSelected && config.selectedDimensions.length === 1
            return (
              <label key={d.value} className={`flex items-center gap-2 ${isLastOne ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} text-sm text-ink`}>
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  disabled={isLastOne}
                  onChange={() => handleDimensionChange(d.value)}
                  className="text-accent focus:ring-accent rounded-sm"
                />
                {d.label}
              </label>
            )
          })}
        </div>
      </div>

      {/* 4. 语气选择 */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <h3 className="text-sm font-bold text-ink mb-4">报告语气</h3>
        <div className="flex gap-4 mb-2">
          {TONES.map(t => (
            <label key={t.value} className="flex items-center gap-1.5 cursor-pointer text-sm text-ink">
              <input 
                type="radio" 
                name="tone" 
                value={t.value} 
                checked={config.tone === t.value}
                onChange={() => onChange({ tone: t.value })}
                className="text-accent focus:ring-accent"
              />
              {t.label}
            </label>
          ))}
        </div>
        <p className="text-[10px] text-inkLight">V1 仅保存配置，不触发 LLM 重写</p>
      </div>

      {/* 5. 模块开关与顺序（仅 Custom 模板显示） */}
      {config.template === 'custom' && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-ink mb-4">模块与顺序 (Custom)</h3>
          <div className="space-y-2">
            {config.sectionOrder.map((secKey, index) => {
              const secDef = ALL_SECTIONS.find(s => s.value === secKey)
              if (!secDef) return null
              const isEnabled = config.enabledSections.includes(secKey)
              
              return (
                <div key={secKey} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-100 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-ink flex-1">
                    <input 
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleSectionToggle(secKey)}
                      className="text-accent focus:ring-accent rounded-sm"
                    />
                    <span className={isEnabled ? '' : 'text-inkLight line-through'}>{secDef.label}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleMoveSection(secKey, 'up')}
                      disabled={index === 0}
                      className="p-1 text-inkLight hover:text-accent disabled:opacity-30 disabled:hover:text-inkLight transition-colors"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleMoveSection(secKey, 'down')}
                      disabled={index === config.sectionOrder.length - 1}
                      className="p-1 text-inkLight hover:text-accent disabled:opacity-30 disabled:hover:text-inkLight transition-colors"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}