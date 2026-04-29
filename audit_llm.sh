#!/bin/bash
cd /home/ubuntu/gambit-v1

echo "=== A.1 所有 API 路由 ==="
find src/app/api -name "route.ts" -o -name "route.tsx" | sort > /tmp/all_routes.txt
echo "总路由数: $(wc -l < /tmp/all_routes.txt)"
echo ""

echo "=== A.2 识别调 LLM 的路由 ==="
> /tmp/llm_routes.txt
for f in $(cat /tmp/all_routes.txt); do
  if grep -lE "chatOnce|streamChat|@/lib/llm-client|@/lib/llm/" "$f" > /dev/null 2>&1; then
    echo "=== LLM ROUTE: $f ===" >> /tmp/llm_routes.txt
  fi
done
cat /tmp/llm_routes.txt

echo ""
echo "=== A.3 审计每个 LLM 路由 ==="
> /tmp/audit_report.txt
for f in $(cat /tmp/all_routes.txt); do
  has_llm=$(grep -lE "chatOnce|streamChat|@/lib/llm-client|@/lib/llm/" "$f" > /dev/null 2>&1 && echo "YES" || echo "NO")
  if [ "$has_llm" = "YES" ]; then
    consume=$(grep -c 'consumeCredits' "$f")
    session=$(grep -c 'getServerSession' "$f")
    ownership=$(grep -cE 'workspace\.userId|userId !== |userId === ' "$f")
    
    echo "########## $f ##########" >> /tmp/audit_report.txt
    echo "LLM? YES" >> /tmp/audit_report.txt
    echo "consumeCredits? $consume" >> /tmp/audit_report.txt
    echo "getServerSession? $session" >> /tmp/audit_report.txt
    echo "ownership check? $ownership" >> /tmp/audit_report.txt
  fi
done

echo ""
echo "=== A.4 审计表 ==="
echo ""
echo "| 路由 | LLM? | consumeCredits? | session? | ownership? | 风险等级 |"
echo "|---|---|---|---|---|---|"

for f in $(cat /tmp/all_routes.txt); do
  has_llm=$(grep -lE "chatOnce|streamChat|@/lib/llm-client|@/lib/llm/" "$f" > /dev/null 2>&1 && echo "YES" || echo "NO")
  if [ "$has_llm" = "YES" ]; then
    consume=$(grep -c 'consumeCredits' "$f")
    session=$(grep -c 'getServerSession' "$f")
    ownership=$(grep -cE 'workspace\.userId|userId !== |userId === ' "$f")
    
    # 判定风险等级
    risk="Safe"
    if [ "$consume" -eq 0 ]; then
      # 检查是否有前端调用
      has_frontend=$(grep -rn "$(basename $(dirname "$f"))" src/ --include="*.tsx" --include="*.ts" | grep -v "src/app/api/" | grep -v "node_modules" | grep -v ".next" | head -1 | wc -l)
      if [ "$has_frontend" -gt 0 ]; then
        risk="High"
      else
        risk="Mid"
      fi
    elif [ "$session" -eq 0 ] || [ "$ownership" -eq 0 ]; then
      risk="Mid"
    fi
    
    echo "| $f | YES | $(if [ $consume -gt 0 ]; then echo 'YES'; else echo 'NO'; fi) | $(if [ $session -gt 0 ]; then echo 'YES'; else echo 'NO'; fi) | $(if [ $ownership -gt 0 ]; then echo 'YES'; else echo 'NO'; fi) | $risk |"
  else
    echo "| $f | NO | - | - | - | Low |"
  fi
done