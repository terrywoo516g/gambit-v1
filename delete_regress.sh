#!/bin/bash
cd /home/ubuntu/gambit-v1

echo "=== 执行删除操作 ==="
echo

sqlite3 data/gambit.db <<'EOF'
.headers on
.changes on

BEGIN TRANSACTION;

-- 锁定目标 userId 列表
CREATE TEMP TABLE _targets AS
SELECT id FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%';

SELECT 'STEP 0: target users' AS step, COUNT(*) AS cnt FROM _targets;

-- 锁定目标 workspaceId 列表
CREATE TEMP TABLE _ws AS
SELECT id FROM Workspace WHERE userId IN (SELECT id FROM _targets);

SELECT 'STEP 0: target workspaces' AS step, COUNT(*) AS cnt FROM _ws;

-- ========== Layer 1: 最深层子表 ==========
DELETE FROM FinalDraftBlock WHERE finalDraftId IN (SELECT id FROM FinalDraft WHERE workspaceId IN (SELECT id FROM _ws));
DELETE FROM LlmCall WHERE modelRunId IN (SELECT id FROM ModelRun WHERE workspaceId IN (SELECT id FROM _ws));

-- ========== Layer 2: workspace 直接子表 ==========
DELETE FROM CreditLog WHERE workspaceId IN (SELECT id FROM _ws);
DELETE FROM ChatMessage WHERE workspaceId IN (SELECT id FROM _ws);
DELETE FROM FinalDraft WHERE workspaceId IN (SELECT id FROM _ws);
DELETE FROM Artifact WHERE workspaceId IN (SELECT id FROM _ws);
DELETE FROM ModelRun WHERE workspaceId IN (SELECT id FROM _ws);
DELETE FROM SceneSession WHERE workspaceId IN (SELECT id FROM _ws);
DELETE FROM Report WHERE workspaceId IN (SELECT id FROM _ws);

-- ========== Layer 3: workspace 本身 ==========
DELETE FROM Workspace WHERE userId IN (SELECT id FROM _targets);

-- ========== Layer 4: User 直接关联 ==========
DELETE FROM CreditTransaction WHERE userId IN (SELECT id FROM _targets);
DELETE FROM "Order" WHERE userId IN (SELECT id FROM _targets);
DELETE FROM Account WHERE userId IN (SELECT id FROM _targets);
DELETE FROM Session WHERE userId IN (SELECT id FROM _targets);

-- ========== Layer 5: User 本身 ==========
DELETE FROM User WHERE id IN (SELECT id FROM _targets);

-- ========== 验证 ==========
SELECT 'CHECK regress users left' AS step, COUNT(*) AS cnt
FROM User WHERE email LIKE 'regress-%' OR email LIKE 'regress-ui-%';

SELECT 'CHECK admin still here' AS step, email, credits
FROM User WHERE email = '100117169@qq.com';

SELECT 'CHECK total users' AS step, COUNT(*) AS cnt FROM User;

COMMIT;

VACUUM;
EOF

echo
echo "=== 清理后数据库大小 ==="
ls -lh data/gambit.db

echo
echo "=== 备份文件位置 ==="
ls -lh data/gambit.db.bak.* | tail -2
