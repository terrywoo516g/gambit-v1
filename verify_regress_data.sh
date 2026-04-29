#!/bin/bash
cd /home/ubuntu/gambit-v1

echo "=== 1. User 列表 ==="
sqlite3 data/gambit.db <<'SQL'
SELECT id, email, credits, datetime(createdAt) FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%' ORDER BY createdAt;
SQL

echo ""
echo "=== 2. CreditTransaction 数量 ==="
sqlite3 data/gambit.db <<'SQL'
SELECT COUNT(*) FROM CreditTransaction WHERE userId IN (SELECT id FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%');
SQL

echo ""
echo "=== 3. Order 数量 ==="
sqlite3 data/gambit.db <<'SQL'
SELECT COUNT(*) FROM "Order" WHERE userId IN (SELECT id FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%');
SQL

echo ""
echo "=== 4. Order 状态分布 ==="
sqlite3 data/gambit.db <<'SQL'
SELECT status, COUNT(*) FROM "Order" WHERE userId IN (SELECT id FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%') GROUP BY status;
SQL

echo ""
echo "=== 5. Workspace 数量 ==="
sqlite3 data/gambit.db <<'SQL'
SELECT COUNT(*) FROM Workspace WHERE userId IN (SELECT id FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%');
SQL

echo ""
echo "=== 6. Account 数量 ==="
sqlite3 data/gambit.db <<'SQL'
SELECT COUNT(*) FROM Account WHERE userId IN (SELECT id FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%');
SQL

echo ""
echo "=== 7. Session 数量 ==="
sqlite3 data/gambit.db <<'SQL'
SELECT COUNT(*) FROM Session WHERE userId IN (SELECT id FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%');
SQL

echo ""
echo "=== 8. 全表清单（用于确认 DELETE 顺序） ==="
sqlite3 data/gambit.db ".tables"

echo ""
echo "=== 9. 管理员账号必须存在（清理后还要再查一次） ==="
sqlite3 data/gambit.db <<'SQL'
SELECT id, email, credits FROM User WHERE email='100117169@qq.com';
SQL

echo ""
echo "=== 10. 真实用户总数（除 regress 外）==="
sqlite3 data/gambit.db <<'SQL'
SELECT COUNT(*) FROM User WHERE email NOT LIKE 'regress%';
SQL
