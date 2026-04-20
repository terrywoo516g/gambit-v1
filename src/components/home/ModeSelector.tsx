'use client';

import { useState, useRef, useEffect } from 'react';

const MODES = [
  { id: 'chat', name: '决策', desc: '多 AI 辩论出最优解', icon: '🎯' },
  { id: 'debate', name: '分歧', desc: '让 AI 互相挑刺找漏洞', icon: '⚔️' },
  { id: 'review', name: '审稿', desc: '多角度审核内容质量', icon: '📝' },
  { id: 'compare', name: '比稿', desc: '多个方案对比择优', icon: '⚖️' },
  { id: 'free', name: '自由', desc: '开放式多 AI 对话', icon: '💬' },
] as const;

interface ModeSelectorProps {
  value: string;
  onChange: (mode: string) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentMode = MODES.find(m => m.id === value) || MODES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm text-slate-700 hover:border-slate-300 transition-colors"
      >
        <span>{currentMode.icon}</span>
        <span className="font-medium">{currentMode.name}</span>
        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
          {MODES.map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                onChange(mode.id);
                setOpen(false);
              }}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                mode.id === value
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'hover:bg-slate-50 text-slate-900'
              }`}
            >
              <span className="text-lg">{mode.icon}</span>
              <div>
                <div className="font-medium text-sm">{mode.name}</div>
                <div className={`text-xs ${mode.id === value ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {mode.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { MODES };
