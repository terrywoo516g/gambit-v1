const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/CompareScene.tsx', 'utf8');

const startIndex = code.indexOf('{tableData && (');
const endIndex = code.indexOf('</div>\n        {report && (<div className="w-2/5 border-l');

if (startIndex !== -1 && endIndex !== -1) {
  const newRender = `{consensus.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">🤝 各AI共识</h4>
              <div className="space-y-2">
                {consensus.map((c, i) => (
                  <div key={i} className="group relative flex items-start gap-2 bg-gray-50/50 border border-gray-100 rounded-xl p-3 text-sm transition hover:bg-gray-50">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                    <div className="flex-1">
                      <div className="font-medium text-ink mb-1">
                        {c.point}
                        <span className="ml-2 text-xs font-normal text-inkLight">（来源：{Array.isArray(c.sources) ? c.sources.join(' / ') : c.sources}）</span>
                      </div>
                      <div className="text-ink/80 leading-relaxed">{c.detail}</div>
                    </div>
                    <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'compare', sourceId: \`consensus-\${i}\`, sourceLabel: 'AI共识', content: \`【共识】\${c.point}\\n\${c.detail}\` } }))} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-accent transition shrink-0 p-1" title="加入素材库"><Pin className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {divergenceNote && (
            <div className="mb-6 p-3 bg-orange-50 border border-orange-100 rounded-xl text-sm flex items-start gap-2">
              <span className="font-bold text-orange-600 shrink-0">分歧核心：</span>
              <span className="text-orange-900 leading-relaxed">{divergenceNote}</span>
            </div>
          )}

          {tableData && (
            <div>
              <h4 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">📋 差异化对比</h4>
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="px-3 py-2 text-left text-xs text-inkLight w-12">操作</th>{tableData.columns.map(col => (<th key={col} onClick={() => handleSort(col)} className="px-3 py-2 text-left text-xs text-inkLight cursor-pointer hover:text-accent whitespace-nowrap">{col} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}</th>))}</tr></thead>
                  <tbody>{sortedRows.map((row, idx) => {
                    const name = row[tableData.columns[0]];
                    const isStarred = starred.includes(name);
                    const rowContent = Object.entries(row).map(([k,v]) => \`\${k}: \${v}\`).join('\\n');
                    return (
                      <tr key={idx} className={\`border-b border-gray-100 hover:bg-gray-50 \${isStarred ? 'bg-yellow-50' : ''}\`}>
                        <td className="px-3 py-2">
                          <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'compare', sourceId: \`compare-\${name}\`, sourceLabel: \`对比表-\${name}\`, content: rowContent } }))} className="text-gray-400 hover:text-accent transition" title="加入素材库"><Pin className="w-3.5 h-3.5" /></button>
                        </td>
                        {tableData.columns.map(col => (<td key={col} className="px-3 py-2 text-ink">{row[col] || '-'}</td>))}
                      </tr>
                    )
                  })}</tbody>
                </table>
              </div>
            </div>
          )}
        `;
  
  code = code.substring(0, startIndex) + newRender + code.substring(endIndex);
  fs.writeFileSync('src/components/scenes/CompareScene.tsx', code);
} else {
  console.error('Indices not found!');
}
