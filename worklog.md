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
