const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

// remove previous insertion
const badInsert = /  useEffect\(\(\) => \{\n    let timer: NodeJS\.Timeout;\n    if \(allDone && !recommendation && activeScene === null && workspaceId && completedCount > 0\) \{[\s\S]*?\}, \[allDone, activeScene, workspaceId, recommendation, completedCount\]\)\n/;
code = code.replace(badInsert, '');

const correctInsertPoint = `  const { streams, allDone, completedCount, total } = useMultiStream(
    runsToStream.length > 0 ? wsId : null,
    runsToStream
  )`;

const correctInsert = `
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

code = code.replace(correctInsertPoint, correctInsertPoint + correctInsert);
fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
