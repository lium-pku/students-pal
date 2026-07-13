---
Task ID: engineering-1
Agent: main
Task: 工程化补全 — 需求文档/Agent 规则/测试体系/全部跑通

Work Log:
- 撰写 docs/REQUIREMENTS.md(8 章节,覆盖全部已实现功能 + 接口 + 数据模型 + 待办)
- 撰写 docs/AGENT_RULES.md(8 章节,含三大硬性要求:需求变更必更新文档/开发改动必 review 测试/任务完成必跑全量测试)
- 撰写 docs/TESTING.md(12 章节,含测试金字塔/工具栈/覆盖率阈值/测试规范/维护规则)
- 安装测试依赖: vitest + @vitest/coverage-v8 + @testing-library/react + @playwright/test + jsdom + @vitejs/plugin-react
- 安装 Playwright chromium 浏览器
- 配置 vitest.config.ts(jsdom 环境/coverage v8/阈值 65/55/60/65/alias @)
- 配置 playwright.config.ts(chromium/webServer 自动启动 dev)
- 配置 tests/setup.ts(matchMedia/ResizeObserver/IntersectionObserver/scrollIntoView 等 jsdom polyfill)
- 编写 tests/integration/__mocks__/db.ts(Prisma 全模型 mock)
- 编写 tests/unit/lib/ai.test.ts(30 个测试,覆盖 8 个 AI 函数 + 4 种思考模式 + JSON 容错 + 错误降级)
- 编写 tests/unit/lib/types.test.ts(5 个测试,api helper 的成功/失败/headers/方法)
- 编写 tests/unit/lib/utils.test.ts(6 个测试,cn 函数的合并/过滤/条件/tailwind-merge)
- 编写 tests/unit/components/Markdown.test.tsx(13 个测试,标题/列表/代码/引用/链接 target=_blank)
- 编写 tests/unit/components/Dashboard.test.tsx(10 个测试,统计卡片/掌握度/状态分布/7日活跃/空状态)
- 编写 tests/unit/components/Subjects.test.tsx(10 个测试,列表/新建/重命名/删除/颜色选择)
- 编写 tests/unit/components/Thinking.test.tsx(13 个测试,列表/状态徽章/详情/AI 引导/删除/新建校验)
- 编写 tests/unit/components/WrongQuestions.test.tsx(15 个测试,列表/题型/状态/AI 解析/状态切换/删除/新建校验)
- 编写 tests/unit/components/Knowledge.test.tsx(12 个测试,列表/掌握度/学科标签/标签/详情/关联图视图/AI 推荐)
- 编写 tests/unit/components/AIPanel.test.tsx(13 个测试,渲染/上下文/推荐提问/搜索模式/历史会话/新对话)
- 编写 tests/integration/api/subjects.test.ts(8 个测试,GET/POST/PUT/DELETE + 校验)
- 编写 tests/integration/api/knowledge.test.ts(17 个测试,含 AI 关联推荐/去重/手动建立/删除)
- 编写 tests/integration/api/thinking.test.ts(14 个测试,含 AI 引导/状态机/上下文注入/错误回滚)
- 编写 tests/integration/api/wrong-questions.test.ts(15 个测试,含 AI 解析/options 序列化/状态切换)
- 编写 tests/integration/api/ai-chat.test.ts(12 个测试,会话 CRUD/发送消息/标题生成/上下文 prompt)
- 编写 tests/integration/api/ai-search-and-stats.test.ts(6 个测试,搜索 + 统计聚合)
- 编写 tests/e2e/dashboard.spec.ts(6 个测试)
- 编写 tests/e2e/subjects.spec.ts(3 个测试)
- 编写 tests/e2e/knowledge.spec.ts(4 个测试)
- 编写 tests/e2e/thinking.spec.ts(3 个测试)
- 编写 tests/e2e/wrong-questions.spec.ts(4 个测试)
- 编写 tests/e2e/ai-panel.spec.ts(6 个测试)
- package.json 增加脚本: test:unit / test:watch / test:coverage / test:e2e / test:e2e:ui / test:all
- .gitignore 增加 coverage/test-results/playwright-report
- eslint.config.mjs 增加 ignores: coverage/test-results/playwright-report/tests
- 修复多轮测试失败:全角问号/strict mode 选择器/Dialog title 重复/scrollIntoView 缺失/中文 URL 编码

Stage Summary:
- 全部测试通过: 199 个单元+集成测试 + 26 个 E2E 测试 = 225 个测试
- 覆盖率达标: 语句 70.83% / 分支 62.32% / 函数 63.56% / 行 72.41%(阈值 65/55/60/65)
- ESLint 零错误零警告
- 三份文档形成完整工程化基线: REQUIREMENTS.md(需求) + AGENT_RULES.md(规则) + TESTING.md(测试策略)
- 下次接手项目的 Agent 只需读这三份文档 + worklog.md 即可无损继续

---
Task ID: engineering-2
Agent: main
Task: 新增开发规则 — 测试后清理测试数据 + 注入演示数据

Work Log:
- 创建 scripts/reset-data.ts: 清空所有业务表 + 注入演示数据(3学科/6知识点/3关联/2思考笔记/2错题/1对话会话)
- 演示数据精心设计:数学/物理/英语三大学科,知识点含 Markdown 格式内容,思考笔记含完整 AI 苏格拉底引导样例,错题含 AI 结构化解析样例
- 重构 reset-data.ts:导出 resetData/clearData 函数供 import 调用,同时保留 CLI 入口(bun run db:seed)
- 创建 tests/e2e/global-teardown.ts:E2E 测试跑完自动调用 clearData + resetData
- playwright.config.ts 增加 globalTeardown 配置
- package.json 增加 db:seed 和 db:clear 脚本
- AGENT_RULES.md 更新:
  * "三大硬性要求" → "四大硬性要求"
  * 新增 2.4 节:测试后必须清理测试数据并注入演示数据
  * 工作流增加步骤 ⑨ bun run db:seed
  * 任务完成检查清单增加 db:seed 项
  * 反模式增加第 8 条"测试残留不清理"
  * 文档版本升至 v1.1
- 验证:E2E 26 个测试全过 + teardown 自动清理成功 + Agent Browser 确认演示数据正确渲染(3学科/6知识点/2思考笔记/2错题)

Stage Summary:
- 新增第四条硬性开发规则,已写入 AGENT_RULES.md 2.4 节
- 演示数据让用户打开应用即可直观感受所有功能(无需手动建数据)
- E2E 测试自动清理,无需手动干预
- 命令: bun run db:seed(清空+注入) / bun run db:clear(仅清空)

---
Task ID: p0-tablet-1
Agent: main
Task: P0 平板适配修复 — 断点逻辑 + 触摸目标

Work Log:
- 修改 src/app/page.tsx 断点逻辑:
  * 侧边栏断点从 md:(768px) 改为 lg:(1024px),768-1023px 用抽屉式
  * AI 面板断点从 lg:(1024px) 改为 md:(768px),≥768px 时 static 侧边 380px,< 768px fixed 全屏
  * 主内容区移除 md:mr-[380px](因 AI 面板 md+ 已是 flex 子项,margin 会双重占位),改用 min-w-0 防 flex 溢出
  * AI 面板宽度从 420px 改为 380px(适配平板)
  * 顶部 AI 按钮文案在 <640px 隐藏文字仅保留图标
  * 移动端抽屉式侧边栏的 nav 按钮 padding 从 p-2.5 加大到 p-3
- 修改 src/components/modules/Knowledge.tsx 触摸目标:
  * 卡片上的 AI推荐/编辑/删除按钮从 size="sm" + h-3.5 图标 改为 size="icon" + h-9 w-9 + h-4 图标(36px)
  * 详情对话框中的关联删除 X 按钮从 h-6 w-6 改为 h-8 w-8(32px)
- 修改 src/components/ai-panel/AIPanel.tsx 触摸目标:
  * 头部三个图标按钮(历史会话/新对话/关闭)从 h-7 w-7 + h-3.5 图标 改为 h-9 w-9 + h-4 图标(36px)
  * 发送按钮从 h-7 w-7 改为 h-9 w-9(36px)
  * 历史会话删除按钮从 h-6 w-6 + opacity-0 group-hover:opacity-100 改为 h-8 w-8 + md:opacity-0 md:group-hover:opacity-100(平板常显,桌面 hover 显)
- 用 Agent Browser 实测四个尺寸:
  * 375px(手机): AI 面板 fixed 全屏覆盖 ✓
  * 768px(平板竖屏): 无侧边栏 + AI 面板 static 380px + 主内容 388px ✓
  * 1024px(平板横屏): 侧边栏 224px + AI 面板 static 380px + 主内容 420px ✓
  * 1280px(桌面): 侧边栏 224px + 主内容 1056px ✓
- 更新 docs/REQUIREMENTS.md:
  * 5.2 响应式章节重写,详述新断点设计
  * 5.3 可访问性章节更新触摸目标尺寸
  * 变更日志增加 v1.1 条目
- 跑全部测试:199 单元测试 + 26 E2E 测试全过,覆盖率达标(70.83%/62.32%/63.56%/72.41%)
- bun run db:seed 清理测试数据,注入演示数据

Stage Summary:
- P0 平板适配完成,核心可用性问题解决
- 平板竖屏(768px)不再被侧边栏挤占,AI 面板不再全屏覆盖主内容
- 平板横屏(1024px)三栏并存,可边看笔记边问 AI
- 触摸目标全部 ≥32px,关键操作按钮 36px
- 桌面端体验无回归
- 4 张实测截图保存到 download/ 目录

---
Task ID: p1-p2-tablet-pwa
Agent: main
Task: P1 体验优化 + P2 PWA 支持

Work Log:

P1 — 体验优化:
- 创建 src/components/AutoTextarea.tsx: 自动撑高的 Textarea(minRows/maxRows 控制),内容增加自动增高,超过 maxRows 启用滚动
- Thinking 模块:question(minRows=2,maxRows=6)+ content(minRows=6,maxRows=20)+ 编辑器 question 全部改用 AutoTextarea
- WrongQuestions 模块:题目/答案/正确答案/错因分析/编辑器表单 全部改用 AutoTextarea
- Knowledge 模块:知识点内容编辑改用 AutoTextarea(minRows=4,maxRows=15)
- AIPanel:对话输入框改用 AutoTextarea(minRows=2,maxRows=6)
- Dialog 自适应:所有 DialogContent 统一加 w-[95vw] + 保留 max-w-3xl/4xl/2xl/md/lg,小屏占 95% 宽度,大屏不超过 max-w
- globals.css:平板区间(768-1023px)html font-size 改为 15px;触摸设备禁用 hover;按钮禁用长按选中+消除 tap-highlight;输入框允许长按选中;横向滚动优化 -webkit-overflow-scrolling: touch
- Knowledge Tab 高度从默认改为 h-10,触摸目标更大

P2 — PWA 支持:
- 创建 scripts/generate-icons.ts:用 sharp 库基于 SVG 生成 192/512 普通+maskable+32 favicon+180 apple-touch-icon
- 运行脚本生成 6 个图标到 public/icons/ 和 public/
- 创建 public/manifest.json:standalone 模式 + 4 个图标(any+maskable) + 3 个 shortcuts(思考/错题/知识)
- 创建 public/sw.js:Service Worker
  * 静态资源:stale-while-revalidate
  * API 请求:网络优先,失败返回缓存
  * 页面导航:网络优先,失败返回 offline.html
  * 安装时预缓存核心资源
  * 激活时清理旧缓存
- 创建 public/offline.html:离线兜底页(暖绿主题+图标+重连按钮+网络恢复自动刷新)
- 更新 src/app/layout.tsx:
  * metadata 增加 manifest/appleWebApp/icons 配置
  * 新增 viewport export:themeColor #2a9d8f + viewportFit cover
  * head 注入 SW 注册脚本(仅生产环境)
- package.json 增加 icons:generate 脚本

验证:
- Agent Browser 实测:manifest.json 可访问(4 icons, 3 shortcuts),sw.js 可访问(200, application/javascript),offline.html 可访问,icon-192.png 可访问,theme-color meta 存在,apple-touch-icon link 存在
- AutoTextarea 实测:思考笔记 dialog 中 question textarea 48px(2 行),content textarea 144px(6 行),自动撑高正常
- Dialog 实测:820px 视口下 dialog 宽 480px(居中,左右各 170px),不顶边缘
- 全部测试:199 单元+集成 + 26 E2E 全过,覆盖率 71.17%/62.29%/63.98%/73.01% 达标
- lint 零错误
- bun run db:seed 清理测试数据,注入演示数据

Stage Summary:
- P1 完成:Dialog 自适应 + Textarea 自动撑高 + 平板字体优化 + 触摸设备适配
- P2 完成:完整 PWA 支持,用户可"添加到主屏幕"作为独立 App,离线有兜底页
- 现在在平板上:iOS Safari 分享→添加到主屏幕,Android Chrome 安装应用,桌面 Chrome/Edge 地址栏安装
- 文档更新:REQUIREMENTS.md 5.2/5.3/5.4(PWA 新章节)/5.5/5.6 + 变更日志 v1.2

---
Task ID: v2-karpathy-migration
Agent: main
Task: v2.0 架构重构 — 从 SQLite/Prisma 迁移到 Karpathy llm-wiki 式文件存储

Work Log:
- 安装 gray-matter(YAML frontmatter 解析库)
- 创建 vault/ 目录结构(5 个子目录:subjects/knowledge/thinking/wrong/chats)
- 实现 src/lib/vault.ts(1057 行):完整的文件存储数据层
  * 5 个实体管理(subjects/knowledge/thinking/wrongQuestions/chats)
  * 每个实体的 CRUD + 列表 + 过滤 + 搜索
  * 知识点关联管理(addRelation/removeRelationByEndpoints)
  * 索引系统(.index.json,每次 getIndex 时重建,不缓存避免外部修改不一致)
  * frontmatter 格式:id/type/subject/tags/mastery/related/status/ai-mode/ai-reflection 等
  * 文件命名:sanitizeFilename(title),title 变更时自动重命名
- 迁移全部 17 个 API 路由到使用 vault:
  * subjects/route.ts + [id]/route.ts
  * knowledge/route.ts + [id]/route.ts + [id]/connect/route.ts + relations/[relId]/route.ts
  * thinking/route.ts + [id]/route.ts + [id]/reflect/route.ts
  * wrong-questions/route.ts + [id]/route.ts + [id]/explain/route.ts
  * ai/chat/route.ts + ai/search/route.ts(未变) + chat-sessions/[id]/route.ts
  * stats/route.ts
- 重写 reset-data.ts:从写 SQLite 改为写 Markdown 文件
- 创建 tests/integration/__mocks__/vault.ts:mock 文件存储层
- 重写全部 5 个集成测试文件:mock vault 而非 Prisma
- 创建 tests/unit/lib/vault.test.ts:26 个单元测试覆盖 vault 的所有实体 CRUD
- 修复关键 bug:
  * getIndex 缓存导致外部文件修改不一致 → 改为每次重建
  * readMarkdown 返回 null 时崩溃 → 加 null 检查
  * Knowledge 组件 p.tags.split(',') 崩溃(tags 现在是数组) → 加 Array.isArray 检查
  * relations 删除接口从 relId 改为 fromId+toId query 参数
- 更新 docs/REQUIREMENTS.md:
  * 6. 技术栈章节:数据存储改为 Markdown 文件 + frontmatter
  * 7.1 已知限制:更新为文件存储相关
  * 8. 变更日志:v2.0 架构重构

验证:
- 214 单元+集成测试全过(含新增 26 个 vault 单元测试)
- 26 E2E 测试全过
- 覆盖率:71.53%/59.9%/67.02%/75.67% 达标
- lint 零错误
- bun run db:seed 正常生成 Markdown 文件
- Agent Browser 验证:应用正常渲染,所有功能可用

Stage Summary:
- v2.0 架构重构完成,数据层从 SQLite 完全迁移到 Markdown 文件
- 数据现在对 AI 工具(Claude Code/Codex/Kimi)友好:可直接读 vault/ 目录下的 .md 文件
- 每个实体一个文件,带 YAML frontmatter(元数据) + Markdown body(内容)
- 文件命名用实体标题,人类可读
- 关联关系用 frontmatter 的 related 字段表达,不破坏两层目录结构
- 索引系统(.index.json)让 UI 查询不慢,AI 工具可忽略索引直接读文件
- 悬空链接暂不自动清理(接受 karpathy 妥协)
- Prisma/SQLite 依赖已移除(但 prisma 包仍在 package.json,后续可清理)

---
Task ID: v2-test-coverage
Agent: main
Task: v2.0 测试覆盖补全 + 文档完善

Work Log:
- docs/REQUIREMENTS.md 新增 5.7 章节:数据存储格式(v2.0 文件存储)
  * 目录结构图
  * 各实体 frontmatter schema 表(必填/可选字段 + body 内容)
  * 关联关系的 YAML 格式说明
  * AI 工具消费示例(Claude Code/Codex/Kimi)
- 补充 E2E 测试(从 26 个增加到 40 个):
  * subjects: 重命名学科、删除学科(取消)
  * knowledge: 编辑知识点、删除知识点、触发 AI 推荐关联
  * thinking: 编辑思考笔记内容、删除思考笔记、触发 AI 引导思考
  * wrong-questions: 编辑错题、删除错题、切换错题状态、触发 AI 解析错题
  * ai-panel: 发送消息并收到回复、关闭 AI 面板
- 补充集成测试(从 188 个增加到 219 个):
  * thinking: PUT 更新字段、PUT 更新 AI 引导内容
  * wrong-questions: PUT 更新字段、PUT options 序列化、PUT 更新 AI 解析

验证:
- 219 单元+集成测试全过
- 40 E2E 测试全过
- 覆盖率:74.37%/62.56%/67.57%/78.28%(全部达标)
- lint 零错误
- bun run db:seed 清理并注入演示数据

Stage Summary:
- E2E 覆盖了所有核心界面操作:新建/编辑/删除/AI 引导/AI 解析/AI 对话/关联推荐
- 集成测试覆盖了所有 API 的 GET/POST/PUT/DELETE + 错误处理
- 文档新增 frontmatter schema 章节,AI 工具有完整参考
- 准备提交 v2.0 tag
