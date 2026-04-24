const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

const useEffectInsert = `
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (allDone && !recommendation && activeScene === null && workspaceId && completedCount > 0) {
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
  }, [allDone, activeScene, workspaceId, recommendation, completedCount])
`;

const insertPoint = `  const [activeRunId, setActiveRunId] = useState<string | null>(null)`;
code = code.replace(insertPoint, insertPoint + '\\n' + useEffectInsert);

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
