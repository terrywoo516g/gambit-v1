#!/bin/bash

cd /home/ubuntu/gambit-v1

BASE="https://gambits.top"
ADMIN_JAR="/tmp/ADMIN_JAR"

echo "=== Step 5: 重新登录 + PDF 测试 ==="
echo

rm -f $ADMIN_JAR

echo "--- 1. 获取 CSRF Token ---"
CSRF_RESP=$(curl -s -c $ADMIN_JAR -b $ADMIN_JAR "$BASE/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESP" | grep -oP '"csrfToken":"\K[^"]+')
echo "CSRF Token: ${CSRF_TOKEN:0:20}..."

echo
echo "--- 2. 登录管理员 ---"
LOGIN_RESP=$(curl -s -c $ADMIN_JAR -b $ADMIN_JAR -X POST \
  "$BASE/api/auth/callback/credentials?json=true" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF_TOKEN" \
  --data-urlencode "email=100117169@qq.com" \
  --data-urlencode "password=wj555555" \
  --data-urlencode "callbackUrl=$BASE" \
  --data-urlencode "json=true" \
  -w "\nHTTP=%{http_code}")

echo "Login HTTP code:" $(echo "$LOGIN_RESP" | grep HTTP= | cut -d= -f2)

echo
echo "--- 3. 验证登录状态 ---"
SESSION_RESP=$(curl -s -b $ADMIN_JAR "$BASE/api/auth/session")
echo "Session:"
echo "$SESSION_RESP"
if ! echo "$SESSION_RESP" | grep -q '"user"'; then
  echo "❌ 登录失败！"
  exit 1
fi

USER_ID=$(echo "$SESSION_RESP" | grep -oP '"id":"\K[^"]+')
echo "✅ 登录成功！User ID: $USER_ID"

echo
echo "--- 4. 获取 admin 的 workspace ID ---"
REPORT_ID=$(sqlite3 data/gambit.db "SELECT id FROM Workspace WHERE userId='$USER_ID' LIMIT 1;")
if [ -z "$REPORT_ID" ]; then
  echo "没有找到 workspace，先创建一个..."
  WS_RESP=$(curl -s -b $ADMIN_JAR -X POST "$BASE/api/workspaces" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"测试 PDF 导出","selectedModels":["doubao-2.0-flash","qwen3.5-flash"]}')
  REPORT_ID=$(echo "$WS_RESP" | grep -oP '"id":"\K[^"]+')
  echo "Created workspace: $REPORT_ID"
else
  echo "Found workspace: $REPORT_ID"
fi

echo
echo "--- 5. 测试 PDF 导出 API ---"
rm -f /tmp/test.pdf

curl -sv -X POST "$BASE/api/export/pdf" \
  -b $ADMIN_JAR \
  -H "Content-Type: application/json" \
  -d "{\"reportId\":\"$REPORT_ID\",\"type\":\"report\"}" \
  -o /tmp/test.pdf \
  -w "\nHTTP=%{http_code}\n" \
  2>&1

HTTP_CODE=$?

echo
echo "--- 6. 验证结果 ---"
if [ -f /tmp/test.pdf ]; then
  FILE_SIZE=$(stat -f%z /tmp/test.pdf 2>/dev/null || stat -c%s /tmp/test.pdf)
  echo "✅ PDF 文件已生成"
  echo "   大小: $FILE_SIZE 字节"
  if command -v file >/dev/null; then
    file /tmp/test.pdf
  fi
  if [ "$FILE_SIZE" -gt 50000 ]; then
    echo "✅ 文件大小 > 50KB"
  else
    echo "⚠️ 文件可能太小"
  fi
else
  echo "❌ PDF 文件未生成"
fi

echo
ls -lh /tmp/test.pdf || echo "File not found"
