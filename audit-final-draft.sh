#!/bin/bash
cd /home/ubuntu/gambit-v1

echo "=== Step 1：列出每个路由是否调用了 consumeCredits ==="
echo ""

ROUTES=(
  "src/app/api/workspaces/\[id\]/final-draft/route.ts"
  "src/app/api/workspaces/\[id\]/final-draft/blocks/route.ts"
  "src/app/api/workspaces/\[id\]/final-draft/blocks/\[blockId\]/route.ts"
  "src/app/api/workspaces/\[id\]/final-draft/generate/route.ts"
  "src/app/api/workspaces/\[id\]/final-draft/generate-stream/route.ts"
  "src/app/api/workspaces/\[id\]/final-draft/compose/route.ts"
  "src/app/api/workspaces/\[id\]/final-draft/polish/route.ts"
  "src/app/api/workspaces/\[id\]/final-draft/review/route.ts"
  "src/app/api/workspaces/\[id\]/final-draft/spark/route.ts"
)

for f in "${ROUTES[@]}"; do
  f_escaped=$(echo "$f" | sed 's/\[/\\[/g; s/\]/\\]/g')
  f_real=$(echo "$f" | sed 's/\\\[/\[/g; s/\\\]/\]/g')
  echo "===== $f_real ====="
  if [ -f "$f_real" ]; then
    echo "[HTTP 方法]"
    grep -E "^export (async )?function (GET|POST|PUT|DELETE|PATCH)" "$f_real" 2>/dev/null || echo "未找到方法（可能用了不同的导出方式）"
    echo ""
    
    echo "[是否调用 LLM]"
    grep -E "openai|anthropic|llm|streamText|generateText|callModel|generateChatCompletion|generateContent" "$f_real" -i 2>/dev/null | head -5 || echo "未找到 LLM 调用"
    echo ""
    
    echo "[是否调用 consumeCredits]"
    grep -E "consumeCredits|InsufficientCreditsError" "$f_real" 2>/dev/null || echo "未找到扣费调用"
    echo ""
    
    echo "[文件行数]"
    wc -l "$f_real" 2>/dev/null
  else
    echo "文件不存在: $f_real"
  fi
  echo ""
  echo "------------------------"
  echo ""
done

echo "=== Step 2：搜哪些路由有前端调用 ==="
echo ""

ENDPOINTS=("" "blocks" "generate" "generate-stream" "compose" "polish" "review" "spark")
for endpoint in "${ENDPOINTS[@]}"; do
  if [ -z "$endpoint" ]; then
    echo "===== /final-draft/ (根路由) ====="
    grep -rn "final-draft" src/ --include="*.tsx" --include="*.ts" \
      | grep -v "src/app/api/\|node_modules\|\.next" \
      | grep -v "final-draft\/" 2>/dev/null || echo "无直接根路由调用"
  else
    echo "===== /final-draft/$endpoint ====="
    grep -rn "final-draft/$endpoint" src/ --include="*.tsx" --include="*.ts" \
      | grep -v "src/app/api/\|node_modules\|\.next" 2>/dev/null || echo "无前端调用"
  fi
  echo ""
done

echo "=== Step 3：额外检查是否有其他引用方式 ==="
echo ""

echo "--- 检查所有 final-draft API 调用 ---"
grep -rn "final-draft" src/ --include="*.tsx" --include="*.ts" \
  | grep -v "node_modules\|\.next"
echo ""
