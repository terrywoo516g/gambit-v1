const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/CompareScene.tsx', 'utf8');

const startTag = 'export default function CompareScene({ workspaceId, onDraftGenerated, referencedRunIds = [] }: CompareSceneProps) {';

const newStates = `export default function CompareScene({ workspaceId, onDraftGenerated, referencedRunIds = [] }: CompareSceneProps) {
  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [consensus, setConsensus] = useState<any[]>([])
  const [divergenceNote, setDivergenceNote] = useState<string>('')
  const [starred, setStarred] = useState<string[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const res = await fetch(\`/api/workspaces/\${workspaceId}/scenes/compare/init\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referencedRunIds }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (cancelled) return
        setSceneId(data.sceneSessionId)
        setTableData(data.tableData)
        setConsensus(data.consensus || [])
        setDivergenceNote(data.divergenceNote || '')
      } catch (e) { if (!cancelled) alert(e instanceof Error ? e.message : '初始化失败') }
      finally { if (!cancelled) setLoading(false) }
    }
    void init()
    return () => { cancelled = true }
  }, [workspaceId])`;

// Replace state block
code = code.replace(/export default function CompareScene[\s\S]*?\}, \[workspaceId\]\)/, newStates);

// Replace loading UI
code = code.replace(
  /if \(loading\) return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" \/><p className="text-inkLight text-sm">正在分析各 AI 回答，提取对比信息\.\.\.<\/p><\/div><\/div>/,
  `if (loading) return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="space-y-4">
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="space-y-3">
          <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
        </div>
      </div>
      <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
      <div className="space-y-4">
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    </div>
  )`
);

// Replace UI render
const oldRender = `{tableData && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="px-3 py-2 text-left text-xs text-inkLight w-16">操作</th>{tableData.columns.map(col => (<th key={col} onClick={() => handleSort(col)} className="px-3 py-2 text-left text-xs text-inkLight cursor-pointer hover:text-accent">{col} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}</th>))}</tr></thead>
                <tbody>{sortedRows.map((row, idx) => {
                  const name = row[tableData.columns[0]];
                  const isStarred = starred.includes(name);
                  const rowContent = Object.entries(row).map(([k,v]) => \`\${k}: \${v}\`).join('\\n');
                  return (
                    <tr key={idx} className={\`border-b border-gray-100 hover:bg-gray-50 \${isStarred ? 'bg-yellow-50' : ''}\`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'compare', sourceId: \`compare-\${name}\`, sourceLabel: \`对比表-\${name}\`, content: rowContent } }))} className="text-gray-400 hover:text-accent transition" title="加入最终稿"><Pin className="w-3.5 h-3.5" /></button>
                          <button onClick={() => toggleStar(name)} className={isStarred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}><Star className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} /></button>
                          <button onClick={() => toggleExclude(name)} className="text-gray-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                      {tableData.columns.map(col => (<td key={col} className="px-3 py-2 text-ink">{row[col] || '-'}</td>))}
                    </tr>
                  )
                })}</tbody>
              </table>
              {excluded.length > 0 && <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-inkLight">已排除 {excluded.length} 项 <button onClick={() => { setExcluded([]); void saveSelections(starred, []) }} className="ml-2 text-accent hover:underline">恢复全部</button></div>}
            </div>
          )}
          {starred.length > 0 && <div className="mt-4 text-xs text-inkLight flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" fill="currentColor" />已标星 {starred.length} 项</div>}`;

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
          )}`;

code = code.replace(oldRender, newRender);

fs.writeFileSync('src/components/scenes/CompareScene.tsx', code);
