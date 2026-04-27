# P-Streaming-Polish：首轮 AI 卡片真流式专项（暂停归档）

## 现象
- 首轮提交后，AI 卡片显示"生成中..."但内容区完全空白（骨架持续显示）
- 顶栏显示 "0/0 已完成"，预期应为 "0/N 已完成"
- 追问区流式正常，仅首轮异常

## 已排除
- AICard 68 字截断逻辑（已在 8b90eb0 移除，streaming 状态直接渲染 {content}）
- Content-Encoding: none header（P1.5 已修复）
- done/allDone 闭合（P1.5 已修复）

## 待排查（恢复专项时优先级）
1. 顶栏 0/0 的数据源——expectedRunCount 是否正确初始化
2. /api/workspaces/[id] GET 是否返回 modelRuns 数组，length 是否为 N
3. useMultiStream 在 runs 加载后是否正确建立 EventSource 连接
4. stream-all EventStream 是否有 token 事件到达（Network 验证）
5. 首轮 stream-all 路径与追问 chat/stream 路径的差异点
6. 是否存在生命周期问题（前端连接 EventSource 时后端已开始生成，前段 token 丢失）
7. useMultiStream 内部是否有 80ms flush 合批 setState 逻辑
8. 是否应将首轮也改为 fetch + ReadableStream，与追问路径统一

## 不影响主链路
- Reflection 生成正常（P2.1 已交付）
- 综合文稿生成正常（P2.2 已交付）
- 不阻塞 P2.4 持久化、P3 报告页、P3.5 PDF 导出

## 恢复时机
P3.5 PDF 导出完成后，作为体验优化专项重启。
重启前必须：(1) 在线上 DevTools 抓 Network EventStream 证据；(2) 服务器 pm2 logs 抓 token 时间戳。
不要在沙盒环境盲改 useMultiStream。

## 相关 commit
- 8b90eb0：Trae P2.1 阶段移除 AICard 截断逻辑
- 当前 main HEAD：8b90eb07b6556a5a6576ab3d366052a44f72d434