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
- 新建 / 重命名 / 删除笔记
- 状态机:draft → reflecting → reflected

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

### 3.6 AI 学伴面板 (AI Panel)

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
- 桌面端(≥ 1024px):侧边栏 + 主内容 + AI 面板三栏
- 平板(768-1023px):侧边栏 + 主内容两栏,AI 面板覆盖式
- 移动端(< 768px):抽屉式侧边栏,AI 面板全屏覆盖

### 5.3 可访问性
- 语义化 HTML(main / header / nav / aside)
- 键盘可达(Enter 发送消息,Esc 关闭 Dialog)
- 触摸目标 ≥ 44px(移动端)

### 5.4 主题
- 暖绿学术色系(避开蓝紫默认)
- 浅色 / 深色主题变量已定义(目前未做切换 UI)

### 5.5 国际化
- 当前仅中文

---

## 6. 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript 5
- **样式**: Tailwind CSS 4 + shadcn/ui (New York 风格)
- **数据库**: Prisma ORM + SQLite
- **状态管理**: React hooks(组件内)+ fetch(API 调用)
- **AI**: z-ai-web-dev-sdk(服务端调用,禁用客户端调用)
- **Markdown**: react-markdown
- **图标**: lucide-react

---

## 7. 已知限制 & 待办

### 7.1 已知限制
- 单用户(无认证系统)
- 数据存储在本地 SQLite,无跨设备同步
- AI 调用无流式输出(整段返回)
- 联网搜索结果不持久化(每次重新搜索)

### 7.2 待办(优先级排序)
1. **思考笔记 AI 引导的进一步沉淀**(用户明确方向,等 AI 能力迭代):
   - 极度启发式提问 + 吝啬给结论
   - 逻辑链作为 AI 自身能力(不进数据模型)
2. 用户系统(NextAuth.js 已安装)
3. 数据导出/导入(JSON 备份)
4. AI 流式输出
5. 知识点关联图的力导向布局
6. 跨笔记的"思维模式"画像

---

## 8. 变更日志

| 日期 | 版本 | 变更 | 作者 |
|---|---|---|---|
| 2026-07-07 | v1.0 | 初始需求文档,覆盖已实现的全部功能 | agent |

---

> **下一步动作**: 接新需求时,先在本文档相应模块下添加"待迭代"条目,并更新版本号和变更日志。
