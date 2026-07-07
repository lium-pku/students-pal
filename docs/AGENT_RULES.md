# Agent 项目要求文档

> **适用于**: 所有在该项目中工作的 AI Agent(包括主 Agent 与子 Agent)
> **强制性**: 以下规则是硬性要求,违反即视为任务失败
> **加载时机**: 每次开始工作前必须完整阅读本文档 + `docs/REQUIREMENTS.md` + `docs/TESTING.md`

---

## 1. 核心工作流(每次任务必走)

```
接到任务
   ↓
① 阅读 docs/REQUIREMENTS.md(理解当前需求状态)
② 阅读 docs/TESTING.md(理解测试约定)
③ 阅读 docs/AGENT_RULES.md(本文档,理解工作规则)
④ 阅读 /home/z/my-project/worklog.md(理解之前 Agent 做了什么)
   ↓
开始开发
   ↓
⑤ 每完成一个有意义的变更,立即:
   - 更新 docs/REQUIREMENTS.md(若有需求变更)
   - 更新 / 或新增对应的测试
   - 跑相关测试,确保通过
   - 在 worklog.md 追加工作记录
   ↓
任务完成前
   ↓
⑥ 跑全量测试:`bun run test:all`
⑦ 跑 lint:`bun run lint`
⑧ 确认测试覆盖率达标(见 TESTING.md)
⑨ 清理测试数据 + 注入演示数据:`bun run db:seed`
⑩ 在 worklog.md 追加最终 stage summary
```

---

## 2. 四大硬性要求(违反即失败)

### 2.1 需求变更必须同步更新文档

**场景**: 以下任一情况发生时,必须更新 `docs/REQUIREMENTS.md`:
- 新增功能模块
- 修改已有功能的行为
- 删除功能
- 接口变更(API 路由 / 参数 / 响应格式)
- 数据模型变更(Prisma schema)
- 业务规则变更

**更新方式**:
1. 在对应模块章节下更新"已实现"或"待迭代"条目
2. 若是新增模块,在"3. 功能模块"下新增章节
3. 更新"4. 数据模型"表格(若涉及)
4. 在"8. 变更日志"追加一行(日期 / 版本 / 变更简述)
5. 版本号递增:小修改 patch(v1.0.0 → v1.0.1),新功能 minor(v1.0.1 → v1.1.0),破坏性变更 major(v1.x → v2.0.0)

**禁止**:
- ❌ 只改代码不改文档
- ❌ 在文档里写"待补充"然后忘记补充
- ❌ 删除功能时不更新文档

### 2.2 开发改动必须 review 测试

**场景**: 以下任一情况发生时,必须 review 并更新测试:
- 新增函数 / API 路由 / 组件 → 必须新增对应测试
- 修改已有函数的行为 → 必须更新对应测试用例
- 修复 Bug → 必须新增回归测试(防止复现)
- 重构(不改变行为) → 测试应保持通过,不强制新增

**Review 检查清单**:
- [ ] 我改动的文件,有对应的测试文件吗?
- [ ] 我新增的分支逻辑,有测试覆盖吗?
- [ ] 我修复的 Bug,有回归测试吗?
- [ ] 测试是否仍然通过?(`bun run test:unit`)

**禁止**:
- ❌ 改代码不跑测试
- ❌ 为了让测试通过而注释掉测试用例
- ❌ 写"假测试"(只调用不断言)

### 2.3 任务完成前必须跑全量测试

**强制命令**:
```bash
bun run test:all
```

**通过标准**:
- 所有单元测试通过
- 所有集成测试通过
- 所有 E2E 测试通过
- 覆盖率达到 `docs/TESTING.md` 中定义的阈值

**失败处理**:
- 测试失败时,优先修复代码,而非修改测试(除非测试本身的断言是错的)
- 若无法立即修复,在 worklog.md 中明确记录失败原因,并在任务报告中标注"测试未通过"

### 2.4 测试后必须清理测试数据并注入演示数据

**场景**: 以下任一情况发生后,必须执行数据清理 + 演示数据注入:
- 运行了 E2E 测试(`bun run test:e2e` 或 `bun run test:all`)
- 手动在开发环境创建了测试用的脏数据(如 "E2E测试学科_xxx"、"测试知识点" 等)
- 任务完成前的最终验收步骤

**强制命令**:
```bash
bun run db:seed
```

此命令会:
1. **清空**所有业务表(Subject / KnowledgePoint / KnowledgeRelation / ThinkingNote / WrongQuestion / ChatSession / ChatMessage)
2. **注入**一组精心设计的演示数据,让用户打开应用就能直观看到功能效果

**演示数据内容**(见 `scripts/reset-data.ts`):
- 3 个学科: 数学📐 / 物理⚛️ / 英语📚
- 6 个知识点: 勾股定理、数轴、乘法交换律、牛顿第二定律、惯性、现在完成时
- 3 条知识点关联(含 AI 生成的关联,带 aiGenerated 标记)
- 2 条思考笔记: 1 条已含 AI 苏格拉底式引导,1 条草稿
- 2 道错题: 1 道已含 AI 结构化解析,1 道未处理
- 1 个 AI 对话会话(含 2 条消息:用户提问 + AI 回复)

**E2E 测试自动清理**:
- `playwright.config.ts` 已配置 `globalTeardown`,E2E 测试跑完会自动调用清理 + 注入
- 但 Agent 仍应在任务完成前**手动跑一次** `bun run db:seed`,确保最终状态干净

**相关命令**:
| 命令 | 用途 |
|---|---|
| `bun run db:seed` | 清空 + 注入演示数据(最常用) |
| `bun run db:clear` | 仅清空,不注入(用于调试) |

**禁止**:
- ❌ 跑完 E2E 测试不清理,留下 "E2E测试学科_1234567890" 这种脏数据
- ❌ 修改 `scripts/reset-data.ts` 中的演示数据时不更新本节描述
- ❌ 在演示数据中使用真实用户的敏感信息

---

## 3. 代码风格与约定

### 3.1 文件结构
- API 路由: `src/app/api/<resource>/route.ts` 或 `src/app/api/<resource>/[id]/route.ts`
- 业务逻辑: `src/lib/`
- React 组件: `src/components/`
- 类型定义: `src/lib/types.ts`
- 测试: `tests/unit/` / `tests/integration/` / `tests/e2e/`

### 3.2 命名
- 文件: PascalCase(组件) / camelCase(工具) / kebab-case(API 路由)
- 变量: camelCase
- 类型/接口: PascalCase
- 常量: UPPER_SNAKE_CASE
- 数据库表/字段: PascalCase 模型名 + camelCase 字段名(Prisma 约定)

### 3.3 TypeScript
- 严格模式
- 优先用 `interface` 描述对象形状,`type` 描述联合/交叉
- 禁止 `any`(必要时用 `unknown` + 类型守卫)
- API 路由的请求/响应必须有类型

### 3.4 React
- 服务端组件默认(无 `'use client'`)
- 需要交互/状态/hooks 的组件加 `'use client'`
- 状态管理优先用 React hooks,跨组件用 Zustand
- API 调用用 `src/lib/types.ts` 中的 `api()` helper

### 3.5 AI 调用
- `z-ai-web-dev-sdk` 只能在服务端使用(API 路由 / Server Action)
- 禁止在客户端组件中 import
- 所有 AI 调用走 `src/lib/ai.ts` 封装的函数,不直接调 SDK

### 3.6 数据库
- Schema 改动后必须 `bun run db:push`
- 不可在生产环境用 `db:reset`
- 查询优先用 Prisma Client 的 `include` / `select` 控制返回字段

---

## 4. 测试约定(摘要)

详见 `docs/TESTING.md`。要点:

- **单元测试**: 覆盖 `src/lib/` 下的纯函数(尤其 AI 封装),用 Vitest + mock
- **集成测试**: 覆盖 API 路由,用 Vitest + mock Prisma
- **组件测试**: 覆盖关键交互组件,用 Vitest + @testing-library/react
- **E2E 测试**: 覆盖核心用户流程,用 Playwright

**覆盖率阈值**:
- 语句(statement): ≥ 70%
- 分支(branch): ≥ 60%
- 函数(function): ≥ 70%
- 行(line): ≥ 70%

---

## 5. Worklog 协议

所有 Agent 共享 `/home/z/my-project/worklog.md`。

**写入规则**:
- 任务开始前: 读 worklog 了解前序工作
- 任务进行中: 每完成一个有意义的步骤,追加一条记录
- 任务结束时: 追加 stage summary

**格式**:
```markdown
---
Task ID: <任务编号,如 2-a>
Agent: <Agent 名称>
Task: <任务简述>

Work Log:
- 步骤 1
- 步骤 2

Stage Summary:
- 关键产出
- 重要决策
- 遗留问题
```

**禁止**:
- ❌ 覆盖已有内容(只能追加)
- ❌ 创建多个 worklog 文件
- ❌ 在 worklog 中写代码片段(用文件路径引用)

---

## 6. 常见反模式(禁止)

1. **"先实现,后补测试"** — 测试和代码同步写,不要攒着
2. **"测试只为覆盖率"** — 测试要验证行为,不是凑行数
3. **"文档写完就忘"** — 改代码必须同步改文档
4. **"agent 各干各的"** — 必须读 worklog,避免重复劳动或冲突
5. **"lint 警告忽略"** — lint 必须零警告零错误
6. **"AI 调用放客户端"** — 严禁,会有 API key 泄露风险
7. **"直接改 Prisma schema 不 push"** — schema 改完必须 `db:push`
8. **"测试残留不清理"** — 跑完测试必须 `bun run db:seed`,留下干净演示数据

---

## 7. 任务完成检查清单

任务报告"完成"前,逐项确认:

- [ ] `docs/REQUIREMENTS.md` 已更新(若涉及需求变更)
- [ ] 新增/修改的代码有对应测试
- [ ] `bun run test:all` 全部通过
- [ ] 覆盖率达到阈值
- [ ] `bun run lint` 零错误
- [ ] `bun run db:seed` 已执行(测试数据已清理,演示数据已注入)
- [ ] `/home/z/my-project/worklog.md` 已追加 stage summary
- [ ] 若涉及数据库 schema 变更,`bun run db:push` 已执行
- [ ] 若涉及 UI 变更,已用 Agent Browser 验证渲染

任一项未完成,不得报告任务完成。

---

## 8. 文档版本

| 日期 | 版本 | 变更 | 作者 |
|---|---|---|---|
| 2026-07-07 | v1.0 | 初始版本 | agent |
| 2026-07-07 | v1.1 | 新增 2.4 测试数据清理规则;新增 `bun run db:seed` / `db:clear` 脚本;E2E 增加 globalTeardown 自动清理 | agent |
