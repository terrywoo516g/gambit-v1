#!/bin/bash

cd /home/ubuntu/gambit-v1

echo "=== Group 0: 服务器健康检查 ==="
echo "1. git log --oneline -1"
git log --oneline -1
echo ""

echo "2. pm2 status"
pm2 status
echo ""

echo "3. pm2 logs gambit --lines 30 --nostream"
pm2 logs gambit --lines 30 --nostream
echo ""

echo "4. df -h /"
df -h /
echo ""

echo "5. .env 关键配置"
cat .env | grep -E 'NEXTAUTH_URL|PAYMENT_PROVIDER|ADMIN_EMAILS'
echo ""

echo "=== Group A: 登录注册测试 ==="
rm -f /tmp/ADMIN_JAR /tmp/USER_JAR

echo "获取 CSRF Token"
CSRF=$(curl -s https://gambits.top/api/auth/csrf | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "CSRF Token: ${CSRF:0:20}..."

echo ""
echo "A1: POST /api/auth/register，弱密码 12345678"
curl -s -X POST https://gambits.top/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test-weak@gambit.test","password":"12345678"}' -i
echo ""

echo "A2: POST /api/auth/register，重复邮箱（管理员邮箱）"
curl -s -X POST https://gambits.top/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"100117169@qq.com","password":"Test1234"}' -i
echo ""

TS=$(date +%s)
EMAIL="regress-$TS@gambit.test"
echo "测试邮箱: $EMAIL" > /tmp/test_email.txt

echo ""
echo "A3: 注册新账号"
curl -s -X POST https://gambits.top/api/auth/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test1234\"}" -i
echo ""

echo "登录管理员到 ADMIN_JAR"
curl -s -L -c /tmp/ADMIN_JAR -b /tmp/ADMIN_JAR \
  -X POST https://gambits.top/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$CSRF&email=100117169@qq.com&password=wj555555" \
  -w '\nHTTP_CODE:%{http_code}\n'
echo ""

echo "重新获取CSRF并再次验证登录"
NEW_CSRF=$(curl -s -b /tmp/ADMIN_JAR https://gambits.top/api/auth/csrf | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "新CSRF: ${NEW_CSRF:0:20}..."

echo ""
echo "验证管理员登录状态"
curl -s -b /tmp/ADMIN_JAR https://gambits.top/api/auth/session | python3 -m json.tool
echo ""

echo "登录测试用户到 USER_JAR"
curl -s -L -c /tmp/USER_JAR -b /tmp/USER_JAR \
  -X POST https://gambits.top/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$CSRF&email=$EMAIL&password=Test1234" \
  -w '\nHTTP_CODE:%{http_code}\n'
echo ""

echo "验证用户登录状态"
curl -s -b /tmp/USER_JAR https://gambits.top/api/auth/session | python3 -m json.tool
echo ""

echo "A4: 未登录 GET /workspaces"
curl -s -L -o /dev/null -w '%{http_code} %{url_effective}\n' https://gambits.top/workspaces
echo ""

echo "A5: 未登录 POST /api/workspaces"
curl -s -X POST https://gambits.top/api/workspaces -i | head -10
echo ""

echo "=== Group B: 积分系统测试 ==="
echo "B1: USER_JAR GET /api/credits/balance"
curl -s -b /tmp/USER_JAR https://gambits.top/api/credits/balance | python3 -m json.tool
echo ""

echo "B2: USER_JAR POST /api/admin/credits/grant"
curl -s -b /tmp/USER_JAR -X POST https://gambits.top/api/admin/credits/grant \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@gambit.test","amount":50,"description":"test"}' -i
echo ""

echo "B3: ADMIN_JAR POST /api/admin/credits/grant"
curl -s -b /tmp/ADMIN_JAR -X POST https://gambits.top/api/admin/credits/grant \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"amount\":50,\"description\":\"回归测试\"}" | python3 -m json.tool
echo ""

echo "B4: B3 后再查 USER_JAR 余额"
curl -s -b /tmp/USER_JAR https://gambits.top/api/credits/balance | python3 -m json.tool
echo ""

echo "B5: grant amount=0"
curl -s -b /tmp/ADMIN_JAR -X POST https://gambits.top/api/admin/credits/grant \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@gambit.test","amount":0,"description":"test"}' -i
echo ""

echo "B6: grant 不存在邮箱"
curl -s -b /tmp/ADMIN_JAR -X POST https://gambits.top/api/admin/credits/grant \
  -H 'Content-Type: application/json' \
  -d '{"email":"nonexistent@test.com","amount":50,"description":"test"}' -i
echo ""

echo "=== Group C: 支付通道 Mock 测试 ==="
echo "C1: 未登录 GET /recharge（GET + 不跟随）"
curl -s -I https://gambits.top/recharge | head -5
echo ""

echo "C2: 未登录 POST /api/payments/create"
curl -s -X POST https://gambits.top/api/payments/create \
  -H 'Content-Type: application/json' \
  -d '{"tierId":"tier_19"}' -i
echo ""

echo "C3: USER_JAR POST /api/payments/create body {tierId:\"tier_19\"}"
ORDER_RESP=$(curl -s -b /tmp/USER_JAR -X POST https://gambits.top/api/payments/create \
  -H 'Content-Type: application/json' \
  -d '{"tierId":"tier_19"}')
echo "$ORDER_RESP"
ORDER_ID=$(echo "$ORDER_RESP" | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)
echo "Order ID: $ORDER_ID"
echo ""

if [ ! -z "$ORDER_ID" ]; then
  echo "C4: USER_JAR GET /api/payments/orders/{orderId}"
  curl -s -b /tmp/USER_JAR https://gambits.top/api/payments/orders/$ORDER_ID | python3 -m json.tool
  echo ""

  echo "C5: ADMIN_JAR GET 同一 orderId"
  curl -s -b /tmp/ADMIN_JAR https://gambits.top/api/payments/orders/$ORDER_ID -i
  echo ""
fi

echo "C6: POST create 用 tierId=\"not_exist\""
curl -s -b /tmp/USER_JAR -X POST https://gambits.top/api/payments/create \
  -H 'Content-Type: application/json' \
  -d '{"tierId":"not_exist"}' -i
echo ""

if [ ! -z "$ORDER_ID" ]; then
  echo "C7: POST /api/payments/callback/mock"
  curl -s -X POST https://gambits.top/api/payments/callback/mock \
    -H 'Content-Type: application/json' \
    -d "{\"orderId\":\"$ORDER_ID\",\"amountCents\":190}" -i
  echo ""

  echo "C8: C7 后查订单"
  curl -s -b /tmp/USER_JAR https://gambits.top/api/payments/orders/$ORDER_ID | python3 -m json.tool
  echo ""

  echo "C9: C8 后查 USER_JAR 余额"
  curl -s -b /tmp/USER_JAR https://gambits.top/api/credits/balance | python3 -m json.tool
  echo ""

  echo "C10: 重放 C7 同一 callback"
  curl -s -X POST https://gambits.top/api/payments/callback/mock \
    -H 'Content-Type: application/json' \
    -d "{\"orderId\":\"$ORDER_ID\",\"amountCents\":190}" -i
  echo ""

  echo "C10 后再次查余额"
  curl -s -b /tmp/USER_JAR https://gambits.top/api/credits/balance | python3 -m json.tool
  echo ""
fi

echo "=== 测试完成 ==="
echo "临时账号: $EMAIL"
