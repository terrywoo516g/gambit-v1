const fs = require('fs');
let content = fs.readFileSync('src/components/workspace/FinalDraftPanel.tsx', 'utf8');

const startTag = '{/* 灵光一闪 (移动到顶部) */}';
const endTag = '          </div>\n        )}';

const replacement = `{/* 灵光一闪 (移动到顶部) */}
        {showSpark && (
          <div className="p-3 bg-white border-b border-gray-200 shadow-sm z-10 relative shrink-0">
            <button onClick={() => setShowSpark(false)} className="absolute top-3 right-3 text-inkLight hover:text-ink z-20">
              <X className="w-4 h-4" />
            </button>
            <button onClick={runSpark} disabled={sparking} className="w-full py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition disabled:opacity-50 flex items-center justify-center gap-2 relative">
              {sparking ? <><Loader2 className="w-4 h-4 animate-spin" /> 启发中...</> : <><Sparkles className="w-4 h-4" /> 给我灵感</>}
            </button>

            {sparks.length > 0 && (
              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {sparks.map(s => {
                  const colorClass = 
                    s.type === '新角度' ? 'text-blue-700 bg-blue-100 border-blue-200' :
                    s.type === '反常识' ? 'text-orange-700 bg-orange-100 border-orange-200' :
                    s.type === '换个说法' ? 'text-purple-700 bg-purple-100 border-purple-200' : 
                    'text-gray-700 bg-gray-100 border-gray-200'

                  return (
                    <div key={s.id} className="p-3 border border-gray-100 bg-gray-50/50 rounded-lg text-sm relative group flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <span className={\`text-[10px] font-semibold px-1.5 py-0.5 rounded border \${colorClass}\`}>
                          [{s.type}]
                        </span>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'spark', sourceId: s.id, sourceLabel: '灵光一闪', content: \`【\${s.type}】\\n\${s.content}\` } }))} className="text-gray-400 hover:text-accent transition opacity-0 group-hover:opacity-100" title="加入素材库">
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-ink/80 leading-relaxed">{s.content}</div>
                    </div>
                  )
                })}
              </div>
            )}`;

const startIndex = content.indexOf(startTag);
if (startIndex !== -1) {
  const endIndex = content.indexOf(endTag, startIndex);
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  }
}

fs.writeFileSync('src/components/workspace/FinalDraftPanel.tsx', content);
