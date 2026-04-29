#!/bin/bash

cd /home/ubuntu/gambit-v1

BASE="https://gambits.top"
ADMIN_JAR="/tmp/ADMIN_JAR"
rm -f $ADMIN_JAR

echo "=== 快速测试 PDF + 看实时错误 ===="

echo
echo "--- 1. 获取 CSRF 登录 ---"
CSRF_RESP=$(curl -s -c $ADMIN_JAR "$BASE/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESP" | grep -oP '"csrfToken":"\K[^"]+')

echo
echo "--- 2. 登录 ---"
curl -s -c $ADMIN_JAR -b $ADMIN_JAR -X POST \
  "$BASE/api/auth/callback/credentials?json=true" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF_TOKEN" \
  --data-urlencode "email=100117169@qq.com" \
  --data-urlencode "password=wj555555" \
  --data-urlencode "callbackUrl=$BASE" \
  --data-urlencode "json=true" > /dev/null

echo
echo "--- 3. 获取 workspace ID ---"
USER_ID=$(curl -s -b $ADMIN_JAR "$BASE/api/auth/session" | grep -oP '"id":"\K[^"]+')
REPORT_ID=$(sqlite3 data/gambit.db "SELECT id FROM Workspace WHERE userId='$USER_ID' LIMIT 1;")
echo "Using workspace: $REPORT_ID"

echo
echo "--- 4. 调用 PDF API（这一次）---"
rm -f /tmp/test.pdf

echo "Calling API..."
curl -s -X POST "$BASE/api/export/pdf" \
  -b $ADMIN_JAR \
  -H "Content-Type: application/json" \
  -d "{\"reportId\":\"$REPORT_ID\",\"type\":\"report\"}" \
  -o /tmp/test.pdf \
  -w "HTTP=%{http_code}\n"

echo
echo "--- 5. 看 pm2 最新错误 ---"
pm2 logs gambit --err --lines 100 --nostream

echo
echo "--- 6. 看 pm2 输出日志 ---"
pm2 logs gambit --out --lines 100 --nostream
