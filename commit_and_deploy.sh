#!/bin/bash
cd /home/ubuntu/gambit-v1

git add -A
git status --short
git diff --stat
git commit -m "fix(billing): 补齐 8 个 LLM 路由扣费 + 删除 spark 死代码

- 删除 src/app/api/workspaces/[id]/spark（被 final-draft/spark 取代）
- chat/stream(10), observer(5), recommend-scene(3) 扣费
- scenes/brainstorm/compare/review/generate 扣费(10/10/5/10)
- stream/[runId] 扣费(5)
- 全部接入 session + ownership + 参数前置校验
- pricing.ts 新增 8 个常量"
git push origin main
pm2 restart gambit
sleep 5
pm2 status
pm2 logs gambit --lines 20 --nostream