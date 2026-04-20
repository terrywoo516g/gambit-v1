'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ModeSelector } from './ModeSelector';
import { TemplateChips } from './TemplateChips';

interface HomeInputProps {
  onSubmit: (text: string, mode: string) => Promise<void>;
}

export function HomeInput({ onSubmit }: HomeInputProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('chat');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      await onSubmit(text.trim(), mode);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTemplateSelect = (templateText: string, templateMode: string) => {
    setText(templateText);
    setMode(templateMode);
    textareaRef.current?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors bg-white">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => {
            setText(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="输入你正在纠结的问题..."
          rows={1}
          className="w-full resize-none bg-transparent border-none focus:outline-none text-base text-slate-900 placeholder:text-slate-400"
          style={{ minHeight: '24px', maxHeight: '144px' }}
        />

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <ModeSelector value={mode} onChange={setMode} />
            <button
              type="button"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="上传文件"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              text.trim() && !loading
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <TemplateChips onSelect={handleTemplateSelect} />
    </div>
  );
}
