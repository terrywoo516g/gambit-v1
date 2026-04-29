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

CSRF=$(curl -s https://gambits.top/api/auth/csrf | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "CSRF Token: $CSRF"

echo ""
echo "A1: POST /api/auth/register，弱密码 12345678"
curl -s -X POST https://gambits.top/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test-weak@gambit.test","password":"12345678"}' -i | head -20
echo ""

echo "A2: POST /api/auth/register，重复邮箱（管理员邮箱）"
curl -s -X POST https://gambits.top/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"100117169@qq.com","password":"Test1234"}' -i | head -20
echo ""

TS=$(date +%s)
EMAIL="regress-$TS@gambit.test"
echo "测试邮箱: $EMAIL"

echo ""
echo "A3: 注册新账号"
curl -s -X POST https://gambits.top/api/auth/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test1234\"}" -i | head -20
echo ""

echo "登录管理员到 ADMIN_JAR"
curl -s -c /tmp/ADMIN_JAR -X POST https://gambits.top/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$CSRF&email=100117169@qq.com&password=wj555555" -w '\nHTTP_CODE:%{http_code}\n' -i | tail -5
echo ""

echo "登录测试用户到 USER_JAR"
curl -s -c /tmp/USER_JAR -X POST https://gambits.top/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "csrfToken=$CSRF&email=$EMAIL&password=Test1234" -w '\nHTTP_CODE:%{http_code}\n' -i | tail -5
echo ""

echo "A4: 未登录 GET /workspaces"
curl -s -L -o /dev/null -w '%{http_code} %{url_effective}\n' https://gambits.top/workspaces
echo ""

echo "A5: 未登录 POST /api/workspaces"
curl -s -X POST https://gambits.top/api/workspaces -i | head -20
echo ""

echo "=== Group B: 积分系统测试 ==="
echo "B1: USER_JAR GET /api/credits/balance"
curl -s -b /tmp/USER_JAR https://gambits.top/api/credits/balance | python3 -m json.tool
echo ""

echo "B2: USER_JAR POST /api/admin/credits/grant"
curl -s -b /tmp/USER_JAR -X POST https://gambits.top/api/admin/credits/grant \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@gambit.test","amount":50,"description":"test"}' -i | head -20
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
  -d '{"email":"test@gambit.test","amount":0,"description":"test"}' -i | head -10
echo ""

echo "B6: grant 不存在邮箱"
curl -s -b /tmp/ADMIN_JAR -X POST https://gambits.top/api/admin/credits/grant \
  -H 'Content-Type: application/json' \
  -d '{"email":"nonexistent@test.com","amount":50,"description":"test"}' -i | head -10
echo ""

echo "=== 测试完成 ==="
echo "临时账号: $EMAIL"
