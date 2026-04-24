const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/CompareScene.tsx', 'utf8');

const regex = /<button onClick=\{handleGenerate\}.*?生成推荐报告.*?<\/button>/;
code = code.replace(regex, '');

// also remove handleGenerate
code = code.replace(/async function handleGenerate\(\) \{[\s\S]*?finally \{ setGenerating\(false\) \}\n  \}/, '');

fs.writeFileSync('src/components/scenes/CompareScene.tsx', code);
