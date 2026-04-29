# 邮箱验证 Resend 集成设计文档

## 1. 现状摘要

Phase 1 盘点显示，项目已经具备 NextAuth 标准的 `VerificationToken` 表，字段为 `identifier`、`token`、`expires`，并有 `@@unique([identifier, token])` 复合唯一约束，因此邮箱验证 token 有现成存储位置。`User` 模型已有 `emailVerified DateTime?` 字段，当前数据库内 2 个用户均已回填为已验证：管理员 `100117169@qq.com` 与 OAuth 用户 `terrywoo516@gmail.com`。这意味着上线邮箱验证功能前，不需要对现有合法用户做额外迁移或补偿。

Resend SDK 当前未安装，`.env` 中也没有 `RESEND_` 或 `EMAIL_` 开头变量；明天实施时需要新增依赖与配置。现有注册路由位于 `src/app/api/auth/register/route.ts`，流程是校验邮箱和密码、查重、创建 User、写入 `signup_bonus` 流水，并返回用户 id；它目前不会发送邮件，也不会阻塞未验证用户。middleware 只检查 JWT 是否存在，未登录 API 返回 401、页面跳转 `/login`，没有基于 `emailVerified` 的权限判断。OAuth 用户路径已在 `events.linkAccount` 中基于 Google `email_verified` 与 GitHub primary verified email 回填 `emailVerified`，因此 OAuth 用户可视为已验证。现有 verification 搜索主要命中 `auth.ts` 的 `emailVerified` 与支付 provider 的 verify callback 类型，未发现独立邮箱验证路由或页面。

## 2. 设计决策点

### 决策点 A：Token 存储方案

**候选 A1**：复用 NextAuth `VerificationToken` 表（schema 已有）
- 优点：无需 schema 迁移，PrismaAdapter 原生支持
- 缺点：表结构受 NextAuth 限制，扩展字段困难

**候选 A2**：新建独立 `EmailVerificationToken` 表
- 优点：完全自主，可加入 ip、userAgent、purpose（注册/换邮箱/重置密码复用）
- 缺点：需要 schema 迁移

**推荐**：A1，复用现有 `VerificationToken` 表。理由是本次目标是 Resend 邮箱验证的第一版接入，schema 已经存在 NextAuth 标准 token 表，且字段足够表达“某个邮箱 identifier 对应一个 token 与过期时间”。这条路径不需要迁移生产 SQLite，也不会引入额外外键或表清理风险。扩展能力确实较弱，例如无法直接记录 purpose、ip、userAgent 或重发计数，但这些不是首版验证链路的硬需求。若未来要把同一套 token 系统扩展到换邮箱、重置密码、风控审计，再新建独立表会更合理。当前建议先用 A1 快速上线，并在业务代码里通过 token 前缀或独立 route 语义区分用途。

### 决策点 B：未验证用户的产品权限

**候选 B1**：注册后立即登录，顶部横幅提示验证，**不限制功能**
- 优点：UX 流畅，注册转化率高
- 缺点：垃圾邮箱可滥用，新人 100 积分薅羊毛风险

**候选 B2**：注册后立即登录，但**未验证不能消耗积分/创建工作区**
- 优点：阻断滥用，但用户能浏览
- 缺点：核心功能拦截需要在多个 API 路由加判断

**候选 B3**：注册后**不能登录**，必须验证邮箱才能进站
- 优点：最严格
- 缺点：UX 重，用户邮件没收到/进垃圾箱直接流失

**推荐**：B1 起步，节后视滥用情况升级 B2。当前 middleware 只有登录态拦截，没有邮箱验证拦截；若直接做 B2，需要在创建 workspace、所有扣费 LLM 路由、充值或关键写接口前补统一判断，改动面明显大于 Resend 接入本身。B3 更重，会把邮件送达率和垃圾箱问题直接变成注册流失。项目当前已有 OAuth 登录，且 credentials 注册仍发 100 积分，首版先用横幅和重发入口建立验证闭环，同时保留 feature flag，能以较低风险上线。若后续观察到明显薅羊毛，再把拦截点集中放到 `consumeCredits` 或 workspace 创建入口，升级到 B2。

### 决策点 C：OAuth 用户与邮箱验证的关系

**候选 C1**：OAuth 邮箱视为已验证（events.linkAccount 已回填 emailVerified），不再要求二次验证
- 优点：OAuth 用户体验顺畅
- 缺点：信任 provider 校验

**候选 C2**：OAuth 也走一次本站邮箱验证流程
- 优点：所有用户路径一致
- 缺点：冗余，OAuth 已经过 provider 校验

**推荐**：C1。Google provider 已在 `signIn` callback 检查 `email_verified`，GitHub provider 已通过 `/user/emails` 获取 primary verified email，并在 `linkAccount` 事件中回填 `emailVerified`。这两个路径已经由上游 provider 完成邮箱所有权验证，再要求本站二次验证会增加摩擦且收益有限。对 OAuth 用户继续信任 provider，也能避免已登录用户突然被要求补验证导致体验断裂。若未来新增不可靠 OAuth provider，应按 provider 单独判断，不应把 Google/GitHub 一并降级。

## 3. 实施流程草案（明天 Terry 拍板后实施）

### 3.1 依赖与配置

- `pnpm add resend`
- `.env` 增加 `RESEND_API_KEY`、`EMAIL_FROM=noreply@gambits.top`
- 增加 feature flag：`EMAIL_VERIFICATION_ENABLED=false`，上线前可先部署关闭态
- Token 存储按推荐 A1 复用 `VerificationToken` 表，无需 schema 迁移

### 3.2 后端

- `src/lib/email/resend.ts`：封装 Resend 客户端，只读取 `RESEND_API_KEY` 与 `EMAIL_FROM`，不在日志中输出密钥
- `src/lib/email/templates/verify.ts`：HTML 邮件模板，包含验证按钮、纯文本链接、过期时间提示和反垃圾基础文案
- `src/app/api/auth/send-verification/route.ts`：登录用户或注册后的邮箱发送验证邮件，生成 token 写入 `VerificationToken`，控制重发频率
- `src/app/api/auth/verify-email/route.ts`：校验 token 未过期后更新 `User.emailVerified`，删除已用 token，跳转登录或工作台
- `src/app/api/auth/register/route.ts`：注册成功后在 feature flag 开启时触发发信；发信失败建议不回滚注册，返回“已注册，可稍后重发”

### 3.3 前端

- 注册页：成功后提示“已发送验证邮件”，并提供“没收到？重发”入口
- 顶部横幅：未验证用户全站显示“验证你的邮箱”与重发按钮；B1 模式下不限制功能
- `/verify-email?token=xxx` 页面：展示验证中、成功、失败或过期状态，并给出重新发送入口
- 登录页：如用户从验证链接返回，可展示简短成功提示

### 3.4 历史用户处理

- 当前 2 个 user 均已 `emailVerified` 非空，无需迁移
- 上线前再次执行 SQL 审计：`SELECT email,emailVerified IS NOT NULL FROM User;`
- 若发现历史合法用户未验证，应先人工回填或单独补发验证邮件，避免上线后被误伤

## 4. 风险与回滚

- **风险 1**：Resend API 限流或宕机。建议注册流程不要强依赖发信成功，发信失败时记录服务端错误并允许用户稍后手动重发；同时在 UI 中提示“邮件可能稍有延迟”。
- **风险 2**：邮件进垃圾箱。虽然 `gambits.top` 的 DKIM/SPF/MX 已验证，但仍应优化发件人名称、主题、纯文本内容和退订/联系信息，避免营销化措辞。
- **风险 3**：登录拦截误伤现有用户。首版采用 B1 不限制功能，风险较低；若后续升级 B2/B3，上线前必须 SQL 审计所有用户的 `emailVerified` 分布。
- **风险 4**：token 泄露或重复使用。验证 token 应使用高熵随机值，只存 hash 或至少保证短有效期；验证成功后立即删除。
- **回滚**：通过 `EMAIL_VERIFICATION_ENABLED` 控制。关闭后注册流程不发信，横幅不显示，验证 API 可返回关闭态提示，主站恢复旧流程。

## 5. 工作量估计

- 决策点 A=A1（复用 VerificationToken 表）：约 2 小时。主要工作是 Resend 客户端、token 生成/校验、两个 API route、注册后触发发信、基础 UI 提示与手动验证。
- 决策点 A=A2（新建表 + 迁移）：约 3-4 小时。除了上述工作，还需要 Prisma schema 迁移、生产 SQLite 迁移验证、回滚方案和额外表清理策略。
- 决策点 B=B1（横幅提示）：包含在 A1 时间内。只需要 session/user 状态查询与 UI 提示，不改核心 API 权限。
- 决策点 B=B2/B3（功能拦截）：额外 +1-2 小时。B2 建议抽统一 helper 或接入 `consumeCredits` 前置检查，避免 10 多个路由散落重复判断；B3 则需要登录/注册/验证页面的状态流更细。

## 6. 给 Terry 拍板的具体问题

1. 决策点 A：是否确认首版复用 NextAuth `VerificationToken` 表（A1），暂不新增 schema？
2. 决策点 B：首版是否采用 B1（提示但不限制功能），把 B2 作为后续反滥用升级？
3. 是否引入 `EMAIL_VERIFICATION_ENABLED` feature flag，并默认先部署为 `false`？
4. 注册后发信失败时，是允许注册成功并提示稍后重发，还是阻断注册？推荐允许注册成功。
5. 验证 token 有效期选择 24 小时、1 小时还是其他？推荐 24 小时起步，重发时废弃旧 token。
