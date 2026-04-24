const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');

// Replace loading UI
code = code.replace(/if \(loading\) return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" \/><p className="text-inkLight text-sm">正在加载素材\.\.\.<\/p><\/div><\/div>/, 
`if (loading) return (
    <div className="flex h-full">
      <div className="w-1/2 p-6 border-r border-gray-200 space-y-6">
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="w-1/2 p-6 space-y-6">
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    </div>
  )`);

// Replace the main UI return structure
const oldUIRegex = /return \(\n    <div className="flex flex-col h-full">[\s\S]*?<\/div>\n  \)\n\}/;
const newUI = `return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><Pencil className="w-4 h-4 text-accent" />创意合成</h3>
        <button onClick={handleGenerate} disabled={generating} className="bg-accent text-white px-5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">{generating ? '合成中...' : '创意合成'}</button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-gray-50/50 p-4 gap-4 overflow-y-auto">
          {modelOutputs.map((output, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm shrink-0">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl shrink-0">
                <span className="font-semibold text-sm text-ink">{output.model}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => navigator.clipboard.writeText(output.content)} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Copy className="w-3 h-3" />复制全文</button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'compose', sourceId: \`compose-\${output.model}\`, sourceLabel: output.model, content: output.content } }))} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Pin className="w-3 h-3" />加入素材库</button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[300px] text-sm text-ink">
                <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{output.content}</ReactMarkdown></div>
              </div>
            </div>
          ))}
        </div>
        <div className="w-1/2 flex flex-col bg-gray-50/30">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100"><h3 className="text-sm font-semibold text-ink">合成模板</h3><p className="text-xs text-inkLight mt-0.5">把你喜欢的内容粘贴到对应栏位</p></div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">1</span>标题</label><input value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} placeholder="粘贴或输入你喜欢的标题..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white" /></div>
            <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">2</span>核心思想 / 结构框架</label><textarea value={templateStructure} onChange={e => setTemplateStructure(e.target.value)} placeholder="粘贴你喜欢的内容结构、大纲、核心论点..." className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
            <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">3</span>正文内容 / 精彩片段</label><textarea value={templateBody} onChange={e => setTemplateBody(e.target.value)} placeholder="粘贴你喜欢的段落、金句、具体描述..." className="w-full min-h-[200px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
            <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-xs">+</span>补充要求（可选）</label><textarea value={templateExtra} onChange={e => setTemplateExtra(e.target.value)} placeholder="对最终稿的额外要求，如风格、字数、语气..." className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
            <div className="text-xs text-inkLight">{[templateTitle, templateStructure, templateBody].filter(Boolean).length}/3 个栏位已填写</div>
            <button onClick={handleGenerate} disabled={generating} className="bg-accent text-white px-5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">{generating ? '合成中...' : '创意合成'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}`;

code = code.replace(oldUIRegex, newUI);

// We should also remove activeTab, applyAsBase from code
code = code.replace(/const \[activeTab, setActiveTab\] = useState\(0\)\n/, '');
code = code.replace(/function applyAsBase[\s\S]*?\}\n/, '');
// Remove MODEL_COLORS
code = code.replace(/const MODEL_COLORS[\s\S]*?\}\n/, '');

fs.writeFileSync('src/components/scenes/ComposeScene.tsx', code);
