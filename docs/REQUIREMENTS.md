# 学伴 · 学生学习工具 — 需求文档

> **状态**: v1.0 已实现 + 待迭代项标注
> **最后更新**: 2026-07-07
> **维护规则**: 每次接新需求 / 开发改动 / Bug 修复,必须同步更新本文档(见 `AGENT_RULES.md`)

---

## 1. 产品定位

一个面向学生的、深度集成 AI 的学习工具。**不只是输入/组织/展示信息的笔记程序**,而是在需要时让 AI 介入:
- 帮助搜索问题
- 建立知识关联
- 解释错题
- 在学生自主思考时给予启发式引导(吝啬给结论,以提问为主)

核心设计原则:**AI 是陪练,不是答案机器**。

---

## 2. 用户与场景

- **目标用户**:中学生 / 大学生 / 自学者
- **核心场景**:
  1. 学完一个知识点后,整理入库,并让 AI 推荐与其他知识的关联
  2. 做错一道题后,记录下来,让 AI 帮助拆解错因
  3. 在学习过程中产生疑问/思考,先自己写下来,再让 AI 用提问方式引导深入
  4. 遇到不懂的概念,直接和 AI 对话;需要最新信息时让 AI 联网搜索

---

## 3. 功能模块

### 3.1 概览仪表盘 (Dashboard)

**已实现**:
- 显示学科/知识点/思考笔记/错题数量统计
- 知识点平均掌握度(百分比 + 进度条)
- 错题状态分布(未处理 / 已解析 / 已掌握)
- 学科分布列表(按学科聚合知识点+错题+笔记数)
- 近 7 天学习活跃度柱状图(思考/错题/知识点三类)

**接口**: `GET /api/stats`

**待迭代**:
- 时间范围筛选(目前固定 30 天)
- 学科维度的趋势对比

---

### 3.2 学科管理 (Subjects)

**已实现**:
- 学科列表(卡片视图,显示颜色标识 + 关联资源数)
- 新建学科(名称 / 颜色 8 选 1 / Emoji 图标)
- 重命名 / 删除学科(删除时其下资源 subjectId 置空)

**接口**:
- `GET /api/subjects` — 列出所有学科(含 _count)
- `POST /api/subjects` — 创建学科
- `PUT /api/subjects/:id` — 更新学科
- `DELETE /api/subjects/:id` — 删除学科

**业务规则**:
- 学科名称必填
- 颜色默认 `#16a34a`
- 删除学科时,关联的知识点/错题/思考笔记的 `subjectId` 设为 null(onDelete: SetNull)

---

### 3.3 知识点 (Knowledge)

**已实现**:
- 知识点列表(网格视图):显示标题 / 内容预览 / 标签 / 学科 / 掌握度 / 关联数
- 知识点详情(Dialog):内容(Markdown) / 标签 / 掌握度 / 关联列表
- 网格视图 ↔ 关联图视图切换
- 关联图视图:SVG 圆形布局,节点为知识点,边为关联,按关联类型着色
- 新建 / 编辑 / 删除知识点
- 关联管理:
  - 5 种关联类型:prerequisite(前置依赖) / extension(拓展延伸) / contrast(对比辨析) / example(典型示例) / related(一般相关)
  - AI 推荐关联:基于目标知识点,从所有其他知识点中找出值得建立的关联,返回候选列表(含类型 + 相关度评分 + 简短说明)
  - 接受 AI 建议 → 创建关联(标记 `aiGenerated=true`)
  - 手动添加关联
  - 删除关联

**接口**:
- `GET /api/knowledge?subjectId=&q=` — 列出知识点(可按学科过滤 / 关键词搜索)
- `POST /api/knowledge` — 创建知识点
- `GET /api/knowledge/:id` — 获取知识点详情(含关联)
- `PUT /api/knowledge/:id` — 更新知识点
- `DELETE /api/knowledge/:id` — 删除知识点(级联删除关联)
- `POST /api/knowledge/:id/connect` — AI 推荐关联
- `PUT /api/knowledge/:id/connect` — 手动建立关联
- `DELETE /api/knowledge/relations/:relId` — 删除关联

**AI 能力**: `suggestKnowledgeRelations(target, candidates)` — 返回 `[{ id, type, description, score }]`

**业务规则**:
- 标题必填
- 标签以英文逗号分隔存储
- 掌握度 0-100
- AI 推荐会去重已存在的关联(双向)

**待迭代**:
- 真正的力导向布局(当前是圆形排列)
- 跨知识点的掌握度热力图

---

### 3.4 自主思考笔记 (Thinking Notes)

**已实现**:
- 思考笔记列表(卡片视图):显示标题 / 状态徽章 / 问题预览 / 内容预览 / 学科 / 是否有 AI 引导
- 笔记详情(Dialog):
  - 思考的起点/问题(可编辑,失焦保存)
  - 学生的思考(Markdown,可编辑,失焦保存)
  - AI 学伴引导区:
    - 4 种引导模式:苏格拉底提问 / 思考镜子 / 理性辩手 / 知识拓展员
    - 一键让 AI 引导
    - AI 输出以 Markdown 渲染
    - 可重新让 AI 引导
  - **关联其他思考笔记(v2.2 新增)**:可在详情中关联其他思考,4 种关系:
    - `extends`(延伸):基于另一条思考进一步展开
    - `contrasts`(对比):与另一条思考形成对比
    - `refutes`(反驳):反驳另一条思考的观点
    - `inspired-by`(受启发):受另一条思考启发
  - **关联知识点**:通过 `related-knowledge` 字段关联知识点(已实现)
- 新建 / 重命名 / 删除笔记
- 状态机:draft → reflecting → reflected

**frontmatter 字段(v2.2 扩展)**:
```yaml
related-knowledge: [kp1, kp2]        # 关联的知识点 id
related-thinking:                     # 关联的其他思考笔记(v2.2 新增)
  - id: thinking_xxx
    type: extends                     # extends | contrasts | refutes | inspired-by
    description: 从负负得正延伸到分配律
```

**接口**:
- `GET /api/thinking?subjectId=&status=&q=` — 列出笔记
- `POST /api/thinking` — 创建笔记
- `GET /api/thinking/:id` — 获取笔记详情
- `PUT /api/thinking/:id` — 更新笔记
- `DELETE /api/thinking/:id` — 删除笔记
- `POST /api/thinking/:id/reflect` — 触发 AI 引导

**AI 能力**: `reflectOnThinking({ question, content, mode, context })` — 4 种模式各有独立 system prompt

**业务规则**:
- 标题必填
- `aiMode` 字段记录最近一次使用的模式
- `aiReflection` 字段保存 AI 输出
- 触发 AI 时状态变 `reflecting`,完成后变 `reflected`,失败回滚到 `draft`

**已确认的迭代方向(暂不实现,等 AI 能力沉淀)**:
- 极度启发式提问 + 吝啬给结论
- 单点击穿式提问(每次只抛一个最关键问题)
- 提示梯度揭示(提示/方向/结论三档)
- 结论配额机制
- **逻辑链作为 AI 自身能力**(不进入数据模型)— 用户已明确这是 AI 模型层面的能力,不在工程上建模

---

### 3.5 错题本 (Wrong Questions)

**已实现**:
- 错题列表(卡片视图):显示题型徽章 / 状态徽章 / 题目预览 / 你的答案 vs 正确答案 / 学科 / 是否已 AI 解析
- 错题详情(Dialog):
  - 题目(可编辑,失焦保存)
  - 你的答案 / 正确答案(可编辑)
  - 错因分析(可编辑,先让学生自己写)
  - 关联知识点(下拉选择)
  - AI 错题解析区:
    - 一键让 AI 解析
    - 输出 4 段结构化:知识点回顾 / 错因分析 / 正确思路 / 易错提醒
    - Markdown 渲染
  - 状态切换:未处理 / 已解析 / 已掌握
- 新建 / 编辑 / 删除错题
- 过滤:按学科 / 按状态 / 关键词搜索

**接口**:
- `GET /api/wrong-questions?subjectId=&status=&q=` — 列出错题
- `POST /api/wrong-questions` — 创建错题
- `GET /api/wrong-questions/:id` — 获取错题详情
- `PUT /api/wrong-questions/:id` — 更新错题
- `DELETE /api/wrong-questions/:id` — 删除错题
- `POST /api/wrong-questions/:id/explain` — 触发 AI 解析

**AI 能力**: `explainWrongQuestion({ question, questionType, options, myAnswer, correctAnswer, analysis, knowledgeContext })` — 返回 `{ concept, whyWrong, howToFix, similarTip }`

**业务规则**:
- 题目必填
- 题型:short / multiple / fill / proof / other
- 触发 AI 解析后状态自动变 `reviewed`
- `options` 字段以 JSON 字符串存储(选择题用)

---

### 3.6 知识地图 (Knowledge Map) — v2.1 新增,v2.2 扩展

**已实现**:
- 独立导航标签"知识地图"
- 学科知识地图:SVG 力导向布局展示该学科下知识点 + 思考笔记 + 错题 + 所有关联
- **节点类型(v2.2 扩展)**:
  - 📚 知识点(圆形)— 颜色按掌握度(红/黄/绿),大小按关联数
  - 💭 思考笔记(方形)— 只显示有关联的(related-knowledge 或 related-thinking 不为空),颜色按状态(草稿灰/已引导蓝)
  - ✗ 错题(三角形)— 只显示有关联的(related-knowledge 不为空),颜色按状态(未处理红/已解析黄/已掌握绿)
- **边类型**:
  - 知识点 ↔ 知识点:prerequisite(红)/ extension(绿)/ contrast(黄)/ example(紫)/ related(蓝)
  - 知识点 → 思考笔记:has-thinking(浅蓝虚线)
  - 知识点 → 错题:has-wrong(浅红虚线)
  - 思考笔记 → 思考笔记:extends / contrasts / refutes / inspired-by(灰色虚线)
- **交互**:
  - 拖拽节点(拖拽后固定)
  - 滚轮缩放 / 拖拽平移画布
  - 点击知识点节点 → 跳转知识点详情
  - 点击思考笔记节点 → 跳转思考笔记详情
  - 点击错题节点 → 跳转错题详情
  - 工具栏:学科切换 / 刷新 / 缩放 / 重置视图
- **缓存**:地图布局缓存到 `vault/.maps/{subjectId}.json`,力导向 100 次迭代(seededRandom 可复现)

**待迭代**:
- 允许用户指定生成范围(只看某几个知识点)
- 允许用户指定链接关系范围(按类型过滤边)
- 力导向布局参数可调
- 悬浮显示节点详情卡片

**接口**:
- `GET /api/knowledge-map?subjectId=xxx` — 获取地图(有缓存则返回缓存,无则生成)
- `POST /api/knowledge-map?subjectId=xxx` — 强制重新生成地图(刷新)

**数据格式**(`vault/.maps/{subjectId}.json`):
```json
{
  "subjectId": "subj_math",
  "nodes": [
    { "id": "kp1", "type": "knowledge", "title": "勾股定理", "mastery": 75, "x": 320, "y": 280, "radius": 22, "relationCount": 2 },
    { "id": "t1", "type": "thinking", "title": "为什么负负得正?", "status": "reflected", "x": 150, "y": 200, "radius": 16 },
    { "id": "w1", "type": "wrong", "title": "负数乘法", "status": "reviewed", "x": 400, "y": 350, "radius": 16 }
  ],
  "edges": [
    { "from": "kp2", "to": "kp1", "type": "prerequisite", "description": "..." },
    { "from": "kp1", "to": "t1", "type": "has-thinking", "description": "" },
    { "from": "kp1", "to": "w1", "type": "has-wrong", "description": "" },
    { "from": "t1", "to": "t2", "type": "extends", "description": "从负负得正延伸" }
  ],
  "generatedAt": "2026-07-15T..."
}
```

---

### 3.7 AI 学伴面板 (AI Panel)

**已实现**:
- 右侧可收起面板
- 上下文感知:从知识点/思考笔记/错题一键发起 AI 对话,自动注入相关上下文
  - 上下文类型:`knowledge` / `thinking` / `wrong` / 通用
  - 上下文信息会写入 ChatSession.context 字段,并在 system prompt 中体现
- 通用对话:多轮对话,基于历史消息构建上下文
- 联网搜索模式:开启后,AI 先调用 `web_search` 函数获取最新信息,再综合搜索结果回答,并标注引用来源 `[1] [2]`
- 历史会话管理:列出 / 选择 / 删除会话
- 自动生成对话标题(基于首条用户消息)
- 推荐提问(空状态显示 4 个建议问题)

**接口**:
- `GET /api/ai/chat` — 列出所有会话
- `POST /api/ai/chat` — 创建会话
- `PUT /api/ai/chat` — 发送消息并获取 AI 回复
- `GET /api/chat-sessions/:id` — 获取会话详情(含所有消息)
- `DELETE /api/chat-sessions/:id` — 删除会话
- `POST /api/ai/search` — 联网搜索 + AI 综合回答

**AI 能力**:
- `chatWithAI(messages)` — 通用对话
- `aiSearch({ query, context })` — 联网搜索 + 综合,返回 `{ answer, sources }`
- `generateChatTitle(firstUserMessage)` — 生成对话标题

**业务规则**:
- 发送消息时,如会话不存在则按需创建
- 首条用户消息且标题为"新对话"时,自动生成标题
- System prompt 根据上下文类型动态构建
- 联网搜索结果以 `meta` 字段(JSON)存储在 ChatMessage 中

---

## 4. 数据模型

详见 `prisma/schema.prisma`。共 7 个模型:

| 模型 | 用途 | 关键字段 |
|---|---|---|
| `Subject` | 学科 | name, color, icon |
| `KnowledgePoint` | 知识点 | title, content, tags, mastery, subjectId |
| `KnowledgeRelation` | 知识点关联 | fromId, toId, type, description, aiGenerated |
| `ThinkingNote` | 自主思考笔记 | title, question, content, aiReflection, aiMode, status |
| `WrongQuestion` | 错题 | question, questionType, options, myAnswer, correctAnswer, analysis, aiExplanation, status |
| `ChatSession` | AI 对话会话 | title, context |
| `ChatMessage` | AI 对话消息 | sessionId, role, content, meta |

数据库: SQLite(开发期),通过 Prisma ORM 访问。

---

## 5. 非功能需求

### 5.1 性能
- API 响应时间 < 200ms(非 AI 调用)
- AI 调用允许较长响应时间(< 90s),前端需显示加载状态
- 前端首屏加载 < 2s

### 5.2 响应式

**断点设计**(2026-07-07 P0 + 2026-07-10 P1 修复后):
- **桌面端(≥ 1024px,lg)**: 侧边栏常驻(224px) + 主内容 + AI 面板侧边(380px)三栏并存
- **平板(768-1023px,md)**: 侧边栏抽屉式(汉堡菜单触发) + 主内容;AI 面板侧边(380px),主内容自动收窄
- **移动端(< 768px)**: 抽屉式侧边栏;AI 面板 fixed 全屏覆盖(w-full)

**关键规则**:
- 侧边栏断点用 `lg:`(1024px),而非 `md:`(768px),避免平板竖屏被侧边栏挤占
- AI 面板断点用 `md:`(768px),≥768px 时为 `static` 占据 flex 空间,< 768px 时为 `fixed` 覆盖
- 主内容区不使用 margin-right 让位(因为 AI 面板在 md+ 已是 flex 子项);`min-w-0` 防止 flex 溢出
- AI 面板宽度统一 380px(原 420px,适配平板)
- **P1 新增**: Dialog 统一用 `w-[95vw] max-w-3xl/4xl`,小屏时占 95% 宽度,大屏不超过 max-w
- **P1 新增**: Textarea 使用 `AutoTextarea` 组件自动撑高(minRows/maxRows 控制),不再用固定 `min-h-`
- **P1 新增**: 平板区间(768-1023px)`html { font-size: 15px }`(原 14px),提升阅读体验
- **P1 新增**: 触摸设备禁用 hover 依赖;按钮禁用长按选中;输入框允许长按选中
- **P1 新增**: Tab 高度从默认改为 `h-10`,触摸目标更大

### 5.3 可访问性
- 语义化 HTML(main / header / nav / aside)
- 键盘可达(Enter 发送消息,Esc 关闭 Dialog)
- 触摸目标 ≥ 36px(平板端图标按钮 h-9 w-9 = 36px,移动端历史会话删除按钮 h-8 w-8)
- 平板上 hover-only 的按钮(如历史会话删除)改为始终可见
- **P1 新增**: 按钮添加 `-webkit-tap-highlight-color: transparent` 消除点击高亮闪烁

### 5.4 PWA 支持(2026-07-10 P2 新增)

**已实现**:
- `manifest.json`: 应用名称/图标/快捷方式(shortcuts:新建思考笔记/错题本/知识点)
- 多尺寸图标: 192/512 普通 + 192/512 maskable + 32 favicon + 180 apple-touch-icon
- Service Worker(`/sw.js`):
  - 静态资源(JS/CSS/图片/图标): stale-while-revalidate
  - API 请求: 网络优先,失败时返回缓存
  - 页面导航: 网络优先,失败时返回离线兜底页
- 离线兜底页(`/offline.html`): 简洁提示页,网络恢复时自动刷新
- layout.tsx 注入: manifest link / theme-color(#2a9d8f) / apple-touch-icon / SW 注册脚本(仅生产环境)

**用户能力**:
- iOS Safari: 分享 → 添加到主屏幕 → 独立 App 图标
- Android Chrome: 安装应用 → 独立 App 图标
- 桌面 Chrome/Edge: 地址栏安装图标 → 独立窗口
- 离线时: 已缓存页面可访问,API 调用失败时显示离线页

**图标生成**:
- 脚本: `scripts/generate-icons.ts`(用 sharp 库基于 SVG 生成多尺寸 PNG)
- 命令: `bun run scripts/generate-icons.ts`

### 5.5 主题
- 暖绿学术色系(避开蓝紫默认)
- 浅色 / 深色主题变量已定义(目前未做切换 UI)
- PWA theme_color: `#2a9d8f`(主色)

### 5.6 国际化
- 当前仅中文

### 5.7 数据存储格式(v2.0 文件存储)

**目录结构**(两层,符合 karpathy llm-wiki):
```
vault/
├── subjects/      # 学科,每个学科一个 .md 文件
├── knowledge/     # 知识点,每个知识点一个 .md 文件
├── thinking/      # 思考笔记,每条一个 .md 文件
├── wrong/         # 错题,每道一个 .md 文件
├── chats/         # AI 对话会话,每个会话一个 .md 文件
└── .index.json    # App 维护的索引(AI 工具可忽略)
```

**文件格式**: YAML frontmatter(元数据) + Markdown body(内容)

**各实体 frontmatter schema**:

| 实体 | 必填字段 | 可选字段 | body 内容 |
|---|---|---|---|
| Subject | `id`, `type: subject`, `name`, `created`, `updated` | `color`, `icon` | `# {name}` |
| KnowledgePoint | `id`, `type: knowledge-point`, `title`, `created`, `updated` | `subject`(id), `tags`[], `mastery`(0-100), `related`[] | 知识点内容(Markdown) |
| ThinkingNote | `id`, `type: thinking-note`, `title`, `created`, `updated` | `subject`(id), `status`(draft/reflecting/reflected), `ai-mode`, `ai-reflection`, `related-knowledge`[], `question` | 学生的思考(Markdown) |
| WrongQuestion | `id`, `type: wrong-question`, `created`, `updated` | `subject`(id), `question-type`, `options`, `my-answer`, `correct-answer`, `status`(unresolved/reviewed/mastered), `related-knowledge`(id), `ai-explanation` | `## 题目\n{question}\n\n## 我的错因分析\n{analysis}` |
| ChatSession | `id`, `type: chat-session`, `title`, `created`, `updated` | `context`(JSON string), `messages`[] | `# {title}` |

**关联关系**(knowledge 的 `related` 字段):
```yaml
related:
  - id: {目标知识点 id}
    type: prerequisite|extension|contrast|example|related
    description: 一句话说明
    ai-generated: true|false
```

**AI 工具消费示例**:
```bash
# Claude Code 分析思考笔记
claude "读 vault/thinking/*.md,分析学生的思维盲点"

# Codex 构建知识关联图
codex "基于 vault/knowledge/*.md 的 frontmatter related 字段,输出知识网络图"

# Kimi 出复习题
kimi "读 vault/wrong/ 下的错题,出 5 道同知识点的变式题"
```

---

## 6. 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript 5
- **样式**: Tailwind CSS 4 + shadcn/ui (New York 风格)
- **数据存储**: **Markdown 文件 + YAML frontmatter**(karpathy llm-wiki 式,2026-07-10 v2.0 重构)
  - 不再使用 SQLite/Prisma(已移除)
  - 数据目录: `vault/`(5 个子目录:subjects/knowledge/thinking/wrong/chats)
  - 索引文件: `vault/.index.json`(App 维护,AI 工具可忽略)
- **状态管理**: React hooks(组件内)+ fetch(API 调用)
- **AI**: z-ai-web-dev-sdk(服务端调用,禁用客户端调用)
- **Markdown**: react-markdown(渲染)+ gray-matter(frontmatter 解析)
- **图标**: lucide-react

---

## 7. 已知限制 & 待办

### 7.1 已知限制
- 单用户(无认证系统)
- 数据存储在本地文件系统(`vault/` 目录),无跨设备同步(但可 Git 同步)
- AI 调用无流式输出(整段返回)
- 联网搜索结果不持久化(每次重新搜索)
- 悬空链接(引用的文件被删)当前不自动清理,后续可通过 App 功能或 AI 能力解决

### 7.2 待办(优先级排序)
1. **思考笔记 AI 引导的进一步沉淀**(用户明确方向,等 AI 能力迭代):
   - 极度启发式提问 + 吝啬给结论
   - 逻辑链作为 AI 自身能力(不进数据模型)
2. 用户系统(NextAuth.js 已安装)
3. 数据导出/导入(JSON 备份)
4. AI 流式输出
5. 知识点关联图的力导向布局
6. 跨笔记的"思维模式"画像

> **已完成**: ~~P1 Dialog/Textarea/字体优化~~ / ~~P2 PWA(manifest+SW+离线页)~~ (2026-07-10)

---

## 8. 变更日志

| 日期 | 版本 | 变更 | 作者 |
|---|---|---|---|
| 2026-07-07 | v1.0 | 初始需求文档,覆盖已实现的全部功能 | agent |
| 2026-07-07 | v1.1 | P0 平板适配:侧边栏断点改 lg:(1024px);AI 面板断点改 md:(768px)侧边 380px;触摸目标放大至 36px+;hover-only 按钮平板常显 | agent |
| 2026-07-10 | v1.2 | P1 体验优化:Dialog 自适应(w-95vw+max-w);AutoTextarea 自动撑高;平板字体 15px;触摸设备禁用 hover/长按选中。P2 PWA:manifest+多尺寸图标+Service Worker+离线兜底页+layout 注入 | agent |
| 2026-07-10 | v2.0 | **架构重构**:数据层从 SQLite/Prisma 迁移到 Markdown 文件 + YAML frontmatter(karpathy llm-wiki 式)。目的:让数据对 AI 工具(Claude Code/Codex/Kimi)友好,可直接读文件。3 个妥协(关联用 frontmatter 引用/接受悬空链接/AI 内容加 status)+ 1 个增强(.index.json 索引) | agent |
| 2026-07-15 | v2.1 | **知识地图**:独立导航标签,SVG 力导向布局展示学科知识点 + 关联。节点按掌握度着色,边按关联类型着色。支持拖拽/缩放/平移/点击跳转。地图布局缓存到 `vault/.maps/{subjectId}.json`。补充 UI 组件测试(AutoTextarea/Knowledge/Thinking/WrongQuestions)。新增 git hooks 强制 lint + 测试 + db:seed | agent |
| 2026-07-17 | v2.2 | **知识地图扩展**:加入思考笔记(方形)和错题(三角形)节点。新增边类型 has-thinking / has-wrong / extends / contrasts / refutes / inspired-by。只显示有关联的思考/错题。思考笔记新增 related-thinking 字段(4 种关系)。点击不同类型节点跳转对应详情 | agent |

---

> **下一步动作**: 接新需求时,先在本文档相应模块下添加"待迭代"条目,并更新版本号和变更日志。
