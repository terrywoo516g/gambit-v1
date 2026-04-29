#!/bin/bash
set -e

BASE="https://gambits.top"

USER_JAR="/tmp/USER_JAR"
ADMIN_JAR="/tmp/ADMIN_JAR"

echo "=== Group D: 扣费埋点测试 ==="

echo "D1: POST /api/workspaces 创建 workspace"
WS_RESP=$(curl -s -b "$USER_JAR" -X POST "$BASE/api/workspaces" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"回归测试问题","selectedModels":["doubao-2.0-flash","qwen3.5-flash"]}')
echo "$WS_RESP"
WS_ID=$(echo "$WS_RESP" | grep -oP '"id":"\K[^"]+')
echo "Workspace ID: $WS_ID"
echo ""

echo "查 D1 后余额:"
BEFORE_STREAM_ALL=$(curl -s -b "$USER_JAR" "$BASE/api/credits/balance" | grep -oP '"credits":\K\d+')
echo "余额: $BEFORE_STREAM_ALL"

echo ""
echo "D2: stream-all（2模型）- 构造请求"
# 由于 SSE 流式接口难以在脚本中测试，直接记录
echo "stream-all 需要浏览器测试"

echo ""
echo "D6: 测试余额不足场景"
echo "当前余额: $BEFORE_STREAM_ALL"
echo "余额不足时应返回 402"

echo ""
echo "=== 数据库验证 ==="
sqlite3 /home/ubuntu/gambit-v1/data/gambit.db <<EOF
.headers on
.mode column
SELECT id, prompt, title, status FROM Workspace ORDER BY createdAt DESC LIMIT 3;
SELECT email, credits FROM User WHERE email LIKE 'regress-%' ORDER BY createdAt DESC LIMIT 5;
SELECT type, amount, description, createdAt FROM CreditTransaction ORDER BY createdAt DESC LIMIT 10;
SELECT id, status, amountCents, credits, createdAt FROM "Order" ORDER BY createdAt DESC LIMIT 5;
EOF
