#!/bin/bash
set -e

BASE="https://gambits.top"

# ============ 登录函数 ============
login() {
  local jar=$1
  local email=$2
  local password=$3

  rm -f "$jar"

  # Step 1: 拿 CSRF token（同时把 cookie 写进 jar）
  local csrf_resp=$(curl -s -c "$jar" -b "$jar" "$BASE/api/auth/csrf")
  local csrf_token=$(echo "$csrf_resp" | grep -oP '"csrfToken":"\K[^"]+')

  if [ -z "$csrf_token" ]; then
    echo "FAIL: CSRF token 拿不到" >&2
    return 1
  fi
  echo "CSRF: ${csrf_token:0:20}..."

  # Step 2: POST credentials，带 jar 读写 + csrfToken + callbackUrl + json
  local login_resp=$(curl -s -c "$jar" -b "$jar" -X POST \
    "$BASE/api/auth/callback/credentials?json=true" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "csrfToken=$csrf_token" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$password" \
    --data-urlencode "callbackUrl=$BASE" \
    --data-urlencode "json=true" \
    -w "\n%{http_code}")

  local code=$(echo "$login_resp" | tail -1)
  echo "Login response code: $code"

  # Step 3: 验证 session 是否真的拿到
  local session=$(curl -s -b "$jar" "$BASE/api/auth/session")
  echo "Session: $session"

  if echo "$session" | grep -q '"user"'; then
    echo "✅ 登录成功 ($email)"
    return 0
  else
    echo "❌ 登录失败 ($email), session=$session"
    return 1
  fi
}

# ============ 测试开始 ============

echo "=== 准备工作：登录管理员和测试用户 ==="

# 登录管理员
login /tmp/ADMIN_JAR "100117169@qq.com" "wj555555" || exit 1

# 注册新用户
TS=$(date +%s)
USER_EMAIL="regress-${TS}@gambit.test"
REG_RESP=$(curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"Test1234\"}")
echo "注册响应: $REG_RESP"

# 登录新用户
login /tmp/USER_JAR "$USER_EMAIL" "Test1234" || exit 1

# 拿到 userId 备用
USER_ID=$(curl -s -b /tmp/USER_JAR "$BASE/api/auth/session" | grep -oP '"id":"\K[^"]+')
echo "USER_ID=$USER_ID"
echo "USER_EMAIL=$USER_EMAIL"

echo ""
echo "=== Group B: 积分系统测试 ==="

echo "B1: USER_JAR GET /api/credits/balance"
curl -s -b /tmp/USER_JAR "$BASE/api/credits/balance"
echo ""

echo "B2: USER_JAR POST /api/admin/credits/grant"
curl -s -b /tmp/USER_JAR -X POST "$BASE/api/admin/credits/grant" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gambit.test","amount":50,"description":"test"}'
echo ""

echo "B3: ADMIN_JAR POST /api/admin/credits/grant"
curl -s -b /tmp/ADMIN_JAR -X POST "$BASE/api/admin/credits/grant" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"amount\":50,\"description\":\"回归测试\"}"
echo ""

echo "B4: B3 后再查 USER_JAR 余额"
curl -s -b /tmp/USER_JAR "$BASE/api/credits/balance"
echo ""

echo "B5: grant amount=0"
curl -s -b /tmp/ADMIN_JAR -X POST "$BASE/api/admin/credits/grant" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gambit.test","amount":0,"description":"test"}'
echo ""

echo "B6: grant 不存在邮箱"
curl -s -b /tmp/ADMIN_JAR -X POST "$BASE/api/admin/credits/grant" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.com","amount":50,"description":"test"}'
echo ""

echo ""
echo "=== Group C: 支付通道 Mock 测试 ==="

echo "C1: 未登录 GET /recharge（不跟随）"
curl -s -I "$BASE/recharge" | head -5
echo ""

echo "C2: 未登录 POST /api/payments/create"
curl -s -X POST "$BASE/api/payments/create" \
  -H "Content-Type: application/json" \
  -d '{"tierId":"tier_19"}'
echo ""

echo "C3: USER_JAR POST /api/payments/create body {tierId:\"tier_19\"}"
ORDER_RESP=$(curl -s -b /tmp/USER_JAR -X POST "$BASE/api/payments/create" \
  -H "Content-Type: application/json" \
  -d '{"tierId":"tier_19"}')
echo "$ORDER_RESP"
ORDER_ID=$(echo "$ORDER_RESP" | grep -oP '"orderId":"\K[^"]+')
echo "Order ID: $ORDER_ID"
echo ""

if [ ! -z "$ORDER_ID" ]; then
  echo "C4: USER_JAR GET /api/payments/orders/{orderId}"
  curl -s -b /tmp/USER_JAR "$BASE/api/payments/orders/$ORDER_ID"
  echo ""

  echo "C5: ADMIN_JAR GET 同一 orderId"
  curl -s -b /tmp/ADMIN_JAR "$BASE/api/payments/orders/$ORDER_ID"
  echo ""
fi

echo "C6: POST create 用 tierId=\"not_exist\""
curl -s -b /tmp/USER_JAR -X POST "$BASE/api/payments/create" \
  -H "Content-Type: application/json" \
  -d '{"tierId":"not_exist"}'
echo ""

if [ ! -z "$ORDER_ID" ]; then
  echo "C7: POST /api/payments/callback/mock"
  curl -s -X POST "$BASE/api/payments/callback/mock" \
    -H "Content-Type: application/json" \
    -d "{\"orderId\":\"$ORDER_ID\",\"amountCents\":190}"
  echo ""

  echo "C8: C7 后查订单"
  curl -s -b /tmp/USER_JAR "$BASE/api/payments/orders/$ORDER_ID"
  echo ""

  echo "C9: C8 后查 USER_JAR 余额"
  curl -s -b /tmp/USER_JAR "$BASE/api/credits/balance"
  echo ""

  echo "C10: 重放 C7 同一 callback"
  curl -s -X POST "$BASE/api/payments/callback/mock" \
    -H "Content-Type: application/json" \
    -d "{\"orderId\":\"$ORDER_ID\",\"amountCents\":190}"
  echo ""

  echo "C10 后再次查余额"
  curl -s -b /tmp/USER_JAR "$BASE/api/credits/balance"
  echo ""
fi

echo "C11: callback 缺 orderId"
curl -s -X POST "$BASE/api/payments/callback/mock" \
  -H "Content-Type: application/json" \
  -d '{"amountCents":190}'
echo ""

echo "C12: callback 金额不匹配（如 amountCents=1）"
curl -s -X POST "$BASE/api/payments/callback/mock" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$ORDER_ID\",\"amountCents\":1}"
echo ""

echo "C13: callback payjs provider"
curl -s -X POST "$BASE/api/payments/callback/payjs" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test"}'
echo ""

echo ""
echo "=== Group D: 扣费埋点测试 ==="

echo "D1: POST /api/workspaces 创建 workspace"
WS_RESP=$(curl -s -b /tmp/USER_JAR -X POST "$BASE/api/workspaces" \
  -H "Content-Type: application/json" \
  -d '{"scene":"brainstorm","title":"回归测试 Workspace"}')
echo "$WS_RESP"
WS_ID=$(echo "$WS_RESP" | grep -oP '"id":"\K[^"]+')
echo "Workspace ID: $WS_ID"
echo ""

echo "D2: stream-all（2模型）"
echo "需要 SSE 测试..."

echo ""
echo "=== 测试完成 ==="
echo "临时账号: $USER_EMAIL"
echo "临时 Workspace: $WS_ID"
