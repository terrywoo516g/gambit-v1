#!/bin/bash

cd /home/ubuntu/gambit-v1

BASE="https://gambits.top"
ADMIN_JAR="/tmp/ADMIN_JAR"
rm -f $ADMIN_JAR
rm -f /tmp/test.pdf

echo "=== 最后 PDF 测试 ===="

echo
echo "--- 1. 获取 CSRF ---"
CSRF_RESP=$(curl -s -c $ADMIN_JAR "$BASE/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESP" | grep -oP '"csrfToken":"\K[^"]+')

echo
echo "--- 2. 登录管理员 ---"
curl -s -c $ADMIN_JAR -b $ADMIN_JAR -X POST \
  "$BASE/api/auth/callback/credentials?json=true" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF_TOKEN" \
  --data-urlencode "email=100117169@qq.com" \
  --data-urlencode "password=wj555555" \
  --data-urlencode "callbackUrl=$BASE" \
  --data-urlencode "json=true" > /dev/null

echo
echo "--- 3. 获取 session 和 workspace ---"
USER_ID=$(curl -s -b $ADMIN_JAR "$BASE/api/auth/session" | grep -oP '"id":"\K[^"]+')
REPORT_ID=$(sqlite3 data/gambit.db "SELECT id FROM Workspace WHERE userId='$USER_ID' LIMIT 1;")
echo "User ID: $USER_ID"
echo "Workspace ID: $REPORT_ID"

echo
echo "--- 4. 调用 PDF 导出 ---"
echo "Calling API..."
curl -s -X POST "$BASE/api/export/pdf" \
  -b $ADMIN_JAR \
  -H "Content-Type: application/json" \
  -d "{\"reportId\":\"$REPORT_ID\",\"type\":\"report\"}" \
  -o /tmp/test.pdf \
  -w "\nHTTP_CODE=%{http_code}\n"

echo
echo "--- 5. 结果检查 ---"
ls -lh /tmp/test.pdf
if [ -f /tmp/test.pdf ]; then
  FILE_SIZE=$(stat -c %s /tmp/test.pdf)
  echo "File size: $FILE_SIZE bytes"
  if [ "$FILE_SIZE" -gt 1000 ]; then
    echo "✅ 成功！文件大于 1KB！"
    if command -v file > /dev/null 2>&1; then
      file /tmp/test.pdf
    fi
  else
    echo "❌ 文件太小！内容："
    cat /tmp/test.pdf
  fi
else
  echo "❌ 文件未生成！"
fi

echo
echo "--- 6. pm2 最新日志 ---"
pm2 logs gambit --err --lines 20 --nostream
echo
pm2 logs gambit --out --lines 20 --nostream
