#!/bin/bash
set -e

BASE="https://gambits.top"

# 复用已有的 cookie jar
USER_JAR="/tmp/USER_JAR"
ADMIN_JAR="/tmp/ADMIN_JAR"

# 确认 session 还在
echo "=== 验证 session ==="
curl -s -b "$USER_JAR" "$BASE/api/auth/session" | grep -oP '"email":"\K[^"]+'
curl -s -b "$ADMIN_JAR" "$BASE/api/auth/session" | grep -oP '"email":"\K[^"]+'

echo ""
echo "=== Group D: 扣费埋点测试 ==="

# 获取当前余额
echo "当前余额:"
curl -s -b "$USER_JAR" "$BASE/api/credits/balance" | grep -oP '"credits":\K\d+'

echo ""
echo "D1: POST /api/workspaces 创建 workspace"
WS_RESP=$(curl -s -b "$USER_JAR" -X POST "$BASE/api/workspaces" \
  -H "Content-Type: application/json" \
  -d '{"scene":"brainstorm","problem":"回归测试问题"}')
echo "$WS_RESP"
WS_ID=$(echo "$WS_RESP" | grep -oP '"id":"\K[^"]+')
echo "Workspace ID: $WS_ID"
echo ""

echo "D2-D9 需要 SSE 流式接口测试，暂时跳过"
echo "使用数据库直接验证扣费流水"

echo ""
echo "=== 数据库验证 ==="
sqlite3 /home/ubuntu/gambit-v1/data/gambit.db <<EOF
.headers on
.mode column
SELECT email, credits FROM User WHERE email LIKE 'regress-%' ORDER BY createdAt DESC LIMIT 5;
SELECT type, amount, description, createdAt FROM CreditTransaction ORDER BY createdAt DESC LIMIT 10;
SELECT id, status, amountCents, credits, createdAt FROM "Order" ORDER BY createdAt DESC LIMIT 5;
EOF
