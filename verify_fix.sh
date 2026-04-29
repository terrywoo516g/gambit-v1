#!/bin/bash
cd /home/ubuntu/gambit-v1

echo "=== Step 6.1: Review 路由完整 e2e 测试 ==="
echo ""

# 准备：登录获取 ADMIN_JAR
echo "1. 登录管理员..."
rm -f /tmp/ADMIN_JAR

# 获取 CSRF token
csrf_resp=$(curl -s -c /tmp/ADMIN_JAR -b /tmp/ADMIN_JAR "https://gambits.top/api/auth/csrf")
csrf_token=$(echo "$csrf_resp" | grep -oP '"csrfToken":"\K[^"]+')

# 登录
login_resp=$(curl -s -c /tmp/ADMIN_JAR -b /tmp/ADMIN_JAR -X POST \
  "https://gambits.top/api/auth/callback/credentials?json=true" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$csrf_token" \
  --data-urlencode "email=100117169@qq.com" \
  --data-urlencode "password=wj555555" \
  --data-urlencode "callbackUrl=https://gambits.top" \
  --data-urlencode "json=true")

echo "登录响应: $(echo $login_resp | tail -1)"

# 获取 workspace ID
WS_ID=$(sqlite3 /home/ubuntu/gambit-v1/data/gambit.db \
  "SELECT id FROM Workspace WHERE userId=(SELECT id FROM User WHERE email='100117169@qq.com') LIMIT 1;")
echo "Workspace ID: $WS_ID"

echo ""
echo "=== R1: 未登录 → 401 ==="
curl -s -o /dev/null -w "R1 unauth: %{http_code}\n" \
  -X POST "https://gambits.top/api/workspaces/$WS_ID/final-draft/review" \
  -H "Content-Type: application/json" \
  -d '{"text":"hello","workspaceId":"'$WS_ID'"}'

echo ""
echo "=== R3: 参数非法（空 text）→ 400 且不扣费 ==="
BEFORE=$(curl -s -b /tmp/ADMIN_JAR https://gambits.top/api/credits/balance | grep -oP '"credits":\K\d+')
echo "扣费前余额: $BEFORE"
curl -s -o /dev/null -w "R3 invalid: %{http_code}\n" \
  -b /tmp/ADMIN_JAR \
  -X POST "https://gambits.top/api/workspaces/$WS_ID/final-draft/review" \
  -H "Content-Type: application/json" \
  -d '{"text":"","workspaceId":"'$WS_ID'"}'
AFTER=$(curl -s -b /tmp/ADMIN_JAR https://gambits.top/api/credits/balance | grep -oP '"credits":\K\d+')
echo "扣费后余额: $AFTER"
if [ "$BEFORE" -eq "$AFTER" ]; then
  echo "✓ R3 通过：余额未变化"
else
  echo "✗ R3 失败：余额变化了"
fi

echo ""
echo "=== R4: 正常调用 → 200 且扣 3 积分 ==="
BEFORE=$AFTER
echo "扣费前余额: $BEFORE"
curl -s -o /dev/null -w "R4 normal: %{http_code}\n" \
  -b /tmp/ADMIN_JAR \
  -X POST "https://gambits.top/api/workspaces/$WS_ID/final-draft/review" \
  -H "Content-Type: application/json" \
  -d '{"text":"This is a test review.","workspaceId":"'$WS_ID'"}'
AFTER=$(curl -s -b /tmp/ADMIN_JAR https://gambits.top/api/credits/balance | grep -oP '"credits":\K\d+')
echo "扣费后余额: $AFTER"
DIFF=$((BEFORE - AFTER))
if [ "$DIFF" -eq 3 ]; then
  echo "✓ R4 通过：正确扣除 3 积分"
else
  echo "✗ R4 失败：期望扣 3，实际扣 $DIFF"
fi

echo ""
echo "=== R5: 流水正确性 ==="
sqlite3 /home/ubuntu/gambit-v1/data/gambit.db <<EOF
.headers on
.mode column
SELECT type, amount, description FROM CreditTransaction 
WHERE userId=(SELECT id FROM User WHERE email='100117169@qq.com') 
ORDER BY createdAt DESC LIMIT 1;
EOF

echo ""
echo "=== 最终汇总检查 ==="
echo ""
echo "1. 所有新流水 type:"
sqlite3 /home/ubuntu/gambit-v1/data/gambit.db "SELECT DISTINCT type FROM CreditTransaction WHERE type LIKE 'consume_final_draft%';"
echo ""
echo "2. 无负数余额:"
sqlite3 /home/ubuntu/gambit-v1/data/gambit.db "SELECT email, credits FROM User WHERE credits < 0;"
echo ""
echo "3. 当前用户列表:"
sqlite3 /home/ubuntu/gambit-v1/data/gambit.db "SELECT email, credits FROM User ORDER BY createdAt;"