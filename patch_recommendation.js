const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

// Add states
const statesRegex = /const \[activeScene, setActiveScene\] = useState<SceneKey \| null>\(null\)/;
const newStates = `const [activeScene, setActiveScene] = useState<SceneKey | null>(null)
  const [recommendation, setRecommendation] = useState<{scene: string, reason: string} | null>(null)
  const [showRecommendation, setShowRecommendation] = useState(false)`;

code = code.replace(statesRegex, newStates);

// Add useEffect
const useEffectInsert = `
  useEffect(() => {
    let timer: any;
    if (allDone && !recommendation && activeScene === null && workspaceId) {
      fetch(\`/api/workspaces/\${workspaceId}/recommend-scene\`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data && data.scene) {
            setRecommendation(data)
            setShowRecommendation(true)
            timer = setTimeout(() => setShowRecommendation(false), 5000)
          }
        })
        .catch(console.error)
    }
    return () => { if (timer) clearTimeout(timer) }
  }, [allDone, activeScene, workspaceId, recommendation])
`;

const insertAfter = `  const allDone = workspace?.modelRuns?.every(r => r.status === 'done' || r.status === 'completed' || r.status === 'error' || r.status === 'failed') ?? false`;
code = code.replace(insertAfter, insertAfter + useEffectInsert);

// Insert UI
const uiInsertRegex = /<div className="flex items-center gap-2">\n\s*<div className="flex-1 relative">\n\s*<input type="text" value=\{chatInput\}/;
const newUI = `{showRecommendation && recommendation && (
                <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in duration-300 shadow-sm shrink-0">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <span className="text-base">💡</span>
                    <span>{recommendation.reason}，建议使用「{SCENE_DEFS.find(s => s.id === recommendation.scene)?.label || '相关场景'}」</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      enterScene(recommendation.scene as SceneKey)
                      setShowRecommendation(false)
                    }} className="text-xs font-medium text-blue-600 hover:text-blue-800 transition bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                      立即使用
                    </button>
                    <button onClick={() => setShowRecommendation(false)} className="text-blue-400 hover:text-blue-600 transition p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input type="text" value={chatInput}`;

code = code.replace(uiInsertRegex, newUI);
fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
