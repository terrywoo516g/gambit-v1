#!/bin/bash
cd /home/ubuntu/gambit-v1

git add -A
git commit -m "fix(billing): 补齐 final-draft 5 个路由扣费 + ReviewScene 402 处理

- pricing 新增 FINAL_DRAFT_STREAM/COMPOSE/POLISH/SPARK/REVIEW
- generate-stream / compose 各扣 10 积分
- polish / spark / review 各扣 3 积分
- 参数校验前置，非法请求不扣费
- ReviewScene 接入 402 跳 /recharge
- 已知 backlog: 节后做全后端扣费审计 + ownership 工具函数抽取"
git push origin main

echo "=== 提交成功 ==="
git log --oneline -1