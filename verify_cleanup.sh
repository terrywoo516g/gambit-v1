#!/bin/bash
cd /home/ubuntu/gambit-v1

echo "=== 1. 当前所有用户列表（应该 = 管理员 + 真实用户）==="
sqlite3 data/gambit.db <<'SQL'
SELECT id, email, credits, datetime(createdAt) FROM User ORDER BY createdAt;
SQL

echo ""
echo "=== 2. 对比备份里的用户清单 ==="
sqlite3 data/gambit.db.bak.20260428-155839 <<'SQL'
SELECT id, email, credits, datetime(createdAt) FROM User WHERE email NOT LIKE 'regress%' ORDER BY createdAt;
SQL

echo ""
echo "=== 3. 重新执行清理脚本里报错的 DELETE，看具体哪条出错 ==="
echo "（只读运行，不真删）"
sqlite3 data/gambit.db <<'SQL'
SELECT 'FinalDraftBlock' AS tbl, COUNT(*) FROM FinalDraftBlock;
SELECT 'CreditLog' AS tbl, COUNT(*) FROM CreditLog;
SELECT 'FinalDraft' AS tbl, COUNT(*) FROM FinalDraft;
SELECT 'Artifact' AS tbl, COUNT(*) FROM Artifact;
SELECT 'SceneSession' AS tbl, COUNT(*) FROM SceneSession;
SELECT 'Report' AS tbl, COUNT(*) FROM Report;
SELECT 'Account' AS tbl, COUNT(*) FROM Account;
SELECT 'Session' AS tbl, COUNT(*) FROM Session;
SQL

echo ""
echo "=== 4. 检查出错表的结构 ==="
echo "--- FinalDraftBlock ---"
sqlite3 data/gambit.db ".schema FinalDraftBlock"
echo "--- CreditLog ---"
sqlite3 data/gambit.db ".schema CreditLog"
echo "--- FinalDraft ---"
sqlite3 data/gambit.db ".schema FinalDraft"

echo ""
echo "=== 5. 确认当前数据库状态 ==="
echo "Total users:"
sqlite3 data/gambit.db "SELECT COUNT(*) FROM User;"
echo "Regress users remaining:"
sqlite3 data/gambit.db "SELECT COUNT(*) FROM User WHERE email LIKE 'regress%';"
echo "Admin exists:"
sqlite3 data/gambit.db "SELECT email, credits FROM User WHERE email = '100117169@qq.com';"
