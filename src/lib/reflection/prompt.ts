export function buildReflectionPrompt(
  question: string,
  answers: { model: string; content: string }[]
): string {
  const isSingleModel = answers.length === 1;
  const N = answers.length;

  let prompt = `用户问题：${question}\n\n`;
  prompt += `以下是 ${N} 个 AI 模型针对该问题的回答：\n\n`;

  answers.forEach((ans) => {
    prompt += `【模型 ${ans.model}】\n${ans.content}\n\n`;
  });

  prompt += `请你作为分析师，输出严格 JSON 格式（不要包含任何 markdown 代码块标记）：
{
  "summary": "一段 80-120 字的综合判断，提炼核心结论",
  "dimensions": {
    "consensus": [{"id": "c1", "text": "..."}, ...],
    "divergence": [{"id": "d1", "text": "..."}, ...],
    "minority": [{"id": "m1", "text": "..."}, ...],
    "pending": [{"id": "p1", "text": "..."}, ...]
  },
  "draft": "..."
}

要求：
- consensus：多模型共识点 2-4 条；单模型时改为"主要观点"，1-3 条
- divergence：模型间分歧点 1-3 条；单模型时为空数组
- minority：少数模型独有的有价值观点 0-2 条；单模型时为空数组
- pending：需进一步验证的点 0-3 条
- draft：基于多模型回答融合而成的综合文稿。长度 300-500 字，严格不超过 500 字。不得复述 dimensions 中已经列出的四维分析条目细节，仅输出融合性的整体判断与立场。不展开举例、不引用具体法规条文或案例、不复述各模型原文，避免冗长。连续段落，不使用 markdown 标题/列表/代码块，可保留必要的分段换行。中文输出。内部双引号务必转义。
- ${isSingleModel ? '单模型分析时，summary 中需说明"基于单模型回答，分歧分析有限"，并且 draft 首句添加"（仅基于单一模型回答，参考性有限）"作为括号注释' : '每条 text 不超过 60 字'}
- 只输出 JSON，不要任何前后说明`;

  return prompt;
}
