const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/BrainstormScene.tsx', 'utf8');

// Replace handleGenerate
const handleGenerateRegex = /async function handleGenerate\(\) \{[\s\S]*?finally \{ setGenerating\(false\) \}\n  \}/;
const newHandleGenerate = `  async function handleGenerate() {
    if (!sceneId) return
    const promptText = \`你是一个决策顾问。以下是用户关于某个问题（头脑风暴）的标记情况：

用户认同的观点：\${adopted.length > 0 ? adopted.join('；') : '未标记'}
用户否定的观点：\${rejected.length > 0 ? rejected.join('；') : '未标记'}
用户补充的想法：\${notes || '无'}

以下是用户认同的观点，请基于这些观点生成决策建议，不要纳入用户否定的内容。

要求：
- 不要使用 Markdown 标题（如 ###），直接用自然段落。
- 输出 2-4 个段落，每段 100-150 字。
- 语气是"基于各方观点，我的判断是……"而非报告格式。
- 请直接输出建议内容，不要有多余的废话。\`

    window.dispatchEvent(new CustomEvent('gambit:stream-to-draft', { detail: { promptText } }))
  }`;

code = code.replace(handleGenerateRegex, newHandleGenerate);

// Remove right side report panel
const reportRegex = /\{report && \(\<div className="w-2\/5 border-l border-gray-200 bg-white p-4 overflow-y-auto"\>[\s\S]*?\}\)/;
code = code.replace(reportRegex, '');

// Change width of the left panel
code = code.replace(/\{report \? 'w-3\/5' : 'w-full'\}/, "'w-full'");

// Change loading UI
code = code.replace(/if \(loading\) return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" \/><p className="text-inkLight text-sm">正在分析各 AI 的共识与分歧\.\.\.<\/p><\/div><\/div>/, 
`if (loading) return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-8 w-40 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    </div>
  )`);

fs.writeFileSync('src/components/scenes/BrainstormScene.tsx', code);
