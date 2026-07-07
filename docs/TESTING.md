# 测试策略与覆盖率标准

> **目的**: 保证每次代码变更不破坏已有功能,且新功能有测试守护
> **强制性**: 见 `AGENT_RULES.md` 第 2.2 / 2.3 条

---

## 1. 测试金字塔

```
            ┌──────────┐
            │   E2E    │  少量(核心流程,~10 个)
            │ Playwright│
            └──────────┘
        ┌──────────────────┐
        │   集成测试         │  中等(API 路由,~20 个)
        │ Vitest + mock DB  │
        └──────────────────┘
    ┌──────────────────────────┐
    │      单元测试              │  最多(纯函数+组件,~50 个)
    │ Vitest + Testing Library  │
    └──────────────────────────┘
```

---

## 2. 工具栈

| 类型 | 工具 | 配置文件 |
|---|---|---|
| 单元/集成测试 | Vitest | `vitest.config.ts` |
| 组件测试 | @testing-library/react + jsdom | 同上 |
| E2E 测试 | Playwright | `playwright.config.ts` |
| 覆盖率 | Vitest coverage(v8 provider) | 同 vitest.config |
| Mock | vi.mock / vi.fn | Vitest 内置 |

---

## 3. 覆盖率阈值

**全局阈值**(在 `vitest.config.ts` 中配置):

| 指标 | 阈值 |
|---|---|
| 语句(statement) | ≥ 65% |
| 分支(branch) | ≥ 55% |
| 函数(function) | ≥ 60% |
| 行(line) | ≥ 65% |

> **说明**: 当前阈值基于 MVP 阶段设定。API 路由和 lib 工具函数覆盖率已达 100%;组件覆盖率因复杂交互(Dialog/Select/异步流程)较难做到全覆盖,以关键路径覆盖为主。后续可逐步提高阈值到 70/60/70/70。

**例外**:
- `src/app/layout.tsx` / `src/app/page.tsx` 等入口文件,E2E 覆盖即可
- 类型定义文件(`*.d.ts`)不计入
- 测试文件本身不计入

**查看覆盖率报告**:
```bash
bun run test:coverage
# 报告输出到 coverage/ 目录,打开 coverage/index.html 查看
```

---

## 4. 测试文件组织

```
tests/
├── unit/                       # 单元测试
│   ├── lib/
│   │   ├── ai.test.ts          # src/lib/ai.ts
│   │   ├── types.test.ts       # src/lib/types.ts
│   │   └── utils.test.ts       # src/lib/utils.ts
│   └── components/
│       ├── Markdown.test.tsx
│       └── ...
├── integration/                # 集成测试(API 路由)
│   ├── api/
│   │   ├── subjects.test.ts
│   │   ├── knowledge.test.ts
│   │   ├── thinking.test.ts
│   │   ├── wrong-questions.test.ts
│   │   ├── ai-chat.test.ts
│   │   ├── ai-search.test.ts
│   │   ├── chat-sessions.test.ts
│   │   └── stats.test.ts
│   └── __mocks__/
│       ├── prisma.ts           # mock @/lib/db
│       └── zai.ts              # mock z-ai-web-dev-sdk
├── e2e/                        # 端到端测试
│   ├── dashboard.spec.ts
│   ├── subjects.spec.ts
│   ├── knowledge.spec.ts
│   ├── thinking.spec.ts
│   ├── wrong-questions.spec.ts
│   └── ai-panel.spec.ts
└── fixtures/                   # 测试数据
    └── ...
```

**命名约定**:
- 测试文件: `<被测文件名>.test.ts(x)`
- E2E 文件: `<流程名>.spec.ts`
- 测试用例描述: 用中文,与需求文档措辞一致

---

## 5. 单元测试规范

### 5.1 测什么
- `src/lib/` 下的所有导出函数
- `src/components/` 下的纯展示组件(无 API 调用)
- 工具函数(`cn` 等)

### 5.2 不测什么
- Next.js 框架本身
- 第三方库(shadcn/ui 内部)
- 类型(由 TypeScript 编译期保证)

### 5.3 模板

```typescript
import { describe, it, expect, vi } from 'vitest'
import { myFunction } from '@/lib/my-module'

describe('myFunction', () => {
  it('应在输入 X 时返回 Y', () => {
    expect(myFunction('X')).toBe('Y')
  })

  it('应在输入为空时抛出错误', () => {
    expect(() => myFunction('')).toThrow('required')
  })
})
```

### 5.4 AI 函数的测试

AI 函数(`src/lib/ai.ts`)依赖 `z-ai-web-dev-sdk`,测试时必须 mock:

```typescript
// tests/integration/__mocks__/zai.ts
vi.mock('z-ai-web-dev-sdk', () => ({
  default: {
    create: vi.fn().mockResolvedValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'mocked response' } }],
          }),
        },
      },
      functions: {
        invoke: vi.fn().mockResolvedValue([]),
      },
    }),
  },
}))
```

**测试要点**:
- mock SDK 的返回,验证我们的封装逻辑正确
- 验证 prompt 构建是否正确(可通过 spy 检查传入 SDK 的 messages)
- 验证错误处理(SDK 抛错时,我们的函数是否优雅降级)
- 验证 JSON 解析的容错(AI 返回非 JSON 时不崩溃)

---

## 6. 集成测试规范

### 6.1 测什么
- 所有 API 路由的 GET/POST/PUT/DELETE
- 验证:HTTP 状态码 / 响应体结构 / 业务规则 / 错误处理

### 6.2 mock 策略

**mock Prisma**(`@/lib/db`):
- 不连接真实数据库,避免测试间互相污染
- 每个 test case 独立设置 mock 返回值
- 用 `beforeEach` 重置 mock

```typescript
vi.mock('@/lib/db', () => ({
  db: {
    subject: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    // ... 其他模型
  },
}))
```

**mock AI 函数**:
- API 路由中调用的 AI 函数(`reflectOnThinking` / `explainWrongQuestion` 等)在集成测试中 mock
- 单元测试中已测过 AI 函数本身,这里只验证路由调用是否正确

### 6.3 调用方式

用 Next.js 的 route handler 直接调用:

```typescript
import { GET, POST } from '@/app/api/subjects/route'

it('GET /api/subjects 应返回学科列表', async () => {
  const mockSubjects = [{ id: '1', name: '数学' }]
  vi.mocked(db.subject.findMany).mockResolvedValue(mockSubjects)

  const res = await GET()
  const data = await res.json()

  expect(res.status).toBe(200)
  expect(data).toEqual(mockSubjects)
})
```

对于带参数的请求,构造 `NextRequest`:

```typescript
import { NextRequest } from 'next/server'

const req = new NextRequest('http://localhost/api/subjects', {
  method: 'POST',
  body: JSON.stringify({ name: '数学' }),
  headers: { 'Content-Type': 'application/json' },
})
```

---

## 7. 组件测试规范

### 6.1 测什么
- 关键交互:按钮点击 / 表单提交 / Dialog 打开关闭
- 渲染正确性:列表项数量 / 文本内容 / 状态徽章
- 回调:onClick / onChange 是否被正确调用

### 7.2 不测什么
- shadcn/ui 内部组件的实现细节
- 样式(视觉问题由 E2E 截图验证)
- 第三方库的行为

### 7.3 模板

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('应渲染标题', () => {
    render(<MyComponent title="测试" />)
    expect(screen.getByText('测试')).toBeInTheDocument()
  })

  it('点击按钮应调用回调', () => {
    const onClick = vi.fn()
    render(<MyComponent onAction={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: '操作' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

---

## 8. E2E 测试规范

### 8.1 测什么(核心用户流程)

| 测试文件 | 覆盖流程 |
|---|---|
| `dashboard.spec.ts` | 打开首页 → 看到统计卡片 → 点击跳转 |
| `subjects.spec.ts` | 新建学科 → 编辑 → 删除 |
| `knowledge.spec.ts` | 新建知识点 → 编辑 → 触发 AI 推荐关联 → 接受关联 → 切换关联图视图 |
| `thinking.spec.ts` | 新建笔记 → 写思考 → 触发 AI 引导 → 看到引导内容 |
| `wrong-questions.spec.ts` | 新建错题 → 触发 AI 解析 → 切换状态 |
| `ai-panel.spec.ts` | 打开 AI 面板 → 发送消息 → 收到回复 → 联网搜索 |

### 8.2 约定
- 每个 spec 文件独立,不依赖其他 spec 的副作用
- 测试开始前清理数据库(用全局 setup)
- 用 `data-testid` 定位元素,避免依赖文本(文本易变)
- AI 调用在 E2E 中 mock(避免真实调用耗时和不确定性)

### 8.3 运行
```bash
bun run test:e2e
# 或带 UI 调试
bunx playwright test --ui
```

---

## 9. 持续集成命令

| 命令 | 用途 |
|---|---|
| `bun run test:unit` | 只跑单元 + 集成测试(快) |
| `bun run test:e2e` | 只跑 E2E(慢,需启动 dev server) |
| `bun run test:coverage` | 跑单元 + 集成,生成覆盖率报告 |
| `bun run test:all` | 跑全部测试(单元+集成+E2E+覆盖率),CI 用 |

**本地开发**: 改完代码跑 `bun run test:unit`,提交前跑 `bun run test:all`。

---

## 10. 测试数据

- 单元/集成测试:用 mock,不用真实数据
- E2E 测试:用 fixtures(`tests/fixtures/`),每次测试前 reset 数据库
- 禁止: 测试依赖之前的测试副作用

---

## 11. 测试维护

- 新增功能 → 同步新增测试
- 修改行为 → 更新对应测试
- 修复 Bug → 新增回归测试
- 删除功能 → 删除对应测试(并在 worklog 记录)

**禁止**:
- ❌ 为了让 CI 通过而 skip 测试(必须修复或明确标注 reason)
- ❌ 写 `expect(true).toBe(true)` 凑数
- ❌ 测试中复制粘贴大量重复代码(用 `it.each` 或工厂函数)

---

## 12. 文档版本

| 日期 | 版本 | 变更 | 作者 |
|---|---|---|---|
| 2026-07-07 | v1.0 | 初始版本 | agent |
