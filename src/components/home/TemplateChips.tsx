'use client';

interface Template {
  text: string;
  mode: string;
}

const TEMPLATES: Template[] = [
  { text: '该不该接这个 offer？', mode: 'chat' },
  { text: '这篇文章论证有没有漏洞？', mode: 'review' },
  { text: 'A 方案和 B 方案怎么选？', mode: 'compare' },
  { text: '帮我从多个角度分析这个问题', mode: 'debate' },
];

interface TemplateChipsProps {
  onSelect: (text: string, mode: string) => void;
}

export function TemplateChips({ onSelect }: TemplateChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {TEMPLATES.map((t, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(t.text, t.mode)}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-full hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
