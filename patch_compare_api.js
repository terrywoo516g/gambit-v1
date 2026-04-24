const fs = require('fs');
let code = fs.readFileSync('src/app/api/workspaces/[id]/scenes/compare/init/route.ts', 'utf8');

const newExtractPrompt = `    const extractPrompt = \`你是一个信息整理专家。用户的问题是：「\${workspace.prompt}」

以下是多个 AI 对这个问题的回答：

\${allOutputs}

请仔细阅读以上内容，提取并整理成一个严格的 JSON 格式，包含以下三个部分：

1. consensus：所有 AI 都认同的观点（2-4 条），每条自然语言描述 50-120 字。
2. comparisonTable：有分歧或各AI侧重不同的部分，整理成结构化表格对比。
3. divergenceNote：一句话点出主要分歧的核心。

要求：
- 共识和差异不要重复。
- 严格返回 JSON，不要包含任何多余文字或 Markdown 标记。

返回格式示例：
{
  "consensus": [
    { "id": "c1", "point": "共识标题", "detail": "自然语言描述 50-120 字", "sources": ["DeepSeek","MiniMax"] }
  ],
  "comparisonTable": {
    "columns": ["名称", "维度1", "维度2", "来源AI"],
    "rows": [{ "名称": "...", "维度1": "...", "来源AI": "..." }]
  },
  "divergenceNote": "一句话点出主要分歧"
}

注意：
- comparisonTable 的 columns 数组第一项建议是"名称"，最后一项必须是"来源AI"。
- 中间的维度根据问题类型自动确定，通常 3-6 个维度。
- 如果某个维度某个 AI 没提到，填"未提及"。\`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: extractPrompt },
      ],
    })

    // 解析 JSON
    let parsedData
    try {
      const jsonMatch = result.match(/\\{[\\s\\S]*\\}/)
      parsedData = JSON.parse(jsonMatch?.[0] || result)
    } catch {
      parsedData = {
        consensus: [],
        comparisonTable: {
          columns: ['名称', '描述', '来源AI'],
          rows: [{ '名称': '解析失败', '描述': '请重试', '来源AI': '-' }],
        },
        divergenceNote: '解析失败，请重试'
      }
    }`;

// Replace the old prompt logic
code = code.replace(/    const extractPrompt = `你是一个信息整理专家[\s\S]*?\} catch \{\n      tableData = \{\n        columns: \['名称', '描述', '来源AI'\],\n        rows: \[\{ '名称': '解析失败', '描述': '请重试', '来源AI': '-' \}\],\n      \}\n    \}/, newExtractPrompt);

// Also need to update what is sent back
code = code.replace(/payload: JSON\.stringify\(tableData\)/, 'payload: JSON.stringify(parsedData.comparisonTable)');
code = code.replace(/tableData,/g, 'tableData: parsedData.comparisonTable,\n      consensus: parsedData.consensus,\n      divergenceNote: parsedData.divergenceNote,');

fs.writeFileSync('src/app/api/workspaces/[id]/scenes/compare/init/route.ts', code);
