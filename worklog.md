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
