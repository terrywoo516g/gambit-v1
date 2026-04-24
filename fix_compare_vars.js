const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/CompareScene.tsx', 'utf8');

code = code.replace(/export default function CompareScene\(\{ workspaceId, onDraftGenerated, referencedRunIds = \[\] \}: CompareSceneProps\) \{/, `export default function CompareScene({ workspaceId, referencedRunIds = [] }: CompareSceneProps) {`);

code = code.replace(/const \[sceneId, setSceneId\] = useState<string \| null>\(null\)\n  /, '');
code = code.replace(/const \[generating, setGenerating\] = useState\(false\)\n  /, '');
code = code.replace(/const \[report, setReport\] = useState<string \| null>\(null\)\n  /, '');
code = code.replace(/setSceneId\(data\.sceneSessionId\)\n        /, '');

fs.writeFileSync('src/components/scenes/CompareScene.tsx', code);
