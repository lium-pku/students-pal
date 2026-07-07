import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock z-ai-web-dev-sdk
const mockCreate = vi.fn()
const mockChatCompletionsCreate = vi.fn()
const mockFunctionsInvoke = vi.fn()

vi.mock('z-ai-web-dev-sdk', () => ({
  default: {
    create: (...args: any[]) => mockCreate(...args),
  },
}))

mockCreate.mockResolvedValue({
  chat: {
    completions: {
      create: (...args: any[]) => mockChatCompletionsCreate(...args),
    },
  },
  functions: {
    invoke: (...args: any[]) => mockFunctionsInvoke(...args),
  },
})

// 在每个测试前重置模块,以重置 getAI() 内部的 zaiInstance 缓存
let aiModule: typeof import('@/lib/ai')

beforeEach(async () => {
  vi.resetModules()
  // 重新设置 mock(因为 resetModules 会清除模块缓存,但不会清除 vi.mock 的定义)
  mockCreate.mockResolvedValue({
    chat: {
      completions: {
        create: (...args: any[]) => mockChatCompletionsCreate(...args),
      },
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
  })
  aiModule = await import('@/lib/ai')
})

describe('lib/ai.ts', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockChatCompletionsCreate.mockClear()
    mockFunctionsInvoke.mockClear()
  })

  describe('getAI', () => {
    it('应在首次调用时创建实例', async () => {
      mockCreate.mockResolvedValue({ chat: { completions: { create: vi.fn() } }, functions: { invoke: vi.fn() } })
      const ai1 = await aiModule.getAI()
      const ai2 = await aiModule.getAI()
      expect(mockCreate).toHaveBeenCalledTimes(1)
      expect(ai1).toBe(ai2)
    })
  })

  describe('reflectOnThinking', () => {
    it('应在 socratic 模式下使用苏格拉底提问 prompt', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '# 苏格拉底提问\n1. 问题一' } }],
      })

      const result = await aiModule.reflectOnThinking({
        question: '为什么负负得正?',
        content: '我觉得像否定否定就是肯定',
        mode: 'socratic',
      })

      expect(result).toBe('# 苏格拉底提问\n1. 问题一')
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1)
      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[0].role).toBe('system')
      expect(callArg.messages[0].content).toContain('苏格拉底')
      expect(callArg.messages[1].content).toContain('为什么负负得正?')
      expect(callArg.messages[1].content).toContain('否定否定就是肯定')
    })

    it('应在 summarize 模式下使用思考镜子 prompt', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '复述: ...' } }],
      })

      await aiModule.reflectOnThinking({
        question: 'Q',
        content: 'C',
        mode: 'summarize',
      })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('思考镜子')
    })

    it('应在 challenge 模式下使用理性辩手 prompt', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '反驳: ...' } }],
      })

      await aiModule.reflectOnThinking({
        question: 'Q',
        content: 'C',
        mode: 'challenge',
      })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('理性辩手')
    })

    it('应在 extend 模式下使用知识拓展员 prompt', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '拓展: ...' } }],
      })

      await aiModule.reflectOnThinking({
        question: 'Q',
        content: 'C',
        mode: 'extend',
      })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('知识拓展员')
    })

    it('应在未指定 mode 时默认使用 socratic', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'default' } }],
      })

      await aiModule.reflectOnThinking({
        question: 'Q',
        content: 'C',
        mode: 'unknown' as any,
      })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('苏格拉底')
    })

    it('应将 context 注入到 user 消息中', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'OK' } }],
      })

      await aiModule.reflectOnThinking({
        question: 'Q',
        content: 'C',
        mode: 'socratic',
        context: '相关知识点:数轴',
      })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[1].content).toContain('相关知识点:数轴')
    })

    it('应在 question 为空时使用占位文本', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'OK' } }],
      })

      await aiModule.reflectOnThinking({
        question: '',
        content: 'C',
        mode: 'socratic',
      })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[1].content).toContain('未填写具体问题')
    })

    it('应在 content 为空时使用占位文本', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'OK' } }],
      })

      await aiModule.reflectOnThinking({
        question: 'Q',
        content: '',
        mode: 'socratic',
      })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[1].content).toContain('学生还未写下思考内容')
    })

    it('应在 AI 返回空内容时返回兜底文本', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      })

      const result = await aiModule.reflectOnThinking({
        question: 'Q',
        content: 'C',
        mode: 'socratic',
      })

      expect(result).toBe('（AI 未返回内容）')
    })
  })

  describe('suggestKnowledgeRelations', () => {
    it('应在无候选时返回空数组', async () => {
      const result = await aiModule.suggestKnowledgeRelations({
        target: { title: 'T', content: 'C', tags: [] },
        candidates: [],
      })
      expect(result).toEqual([])
      expect(mockChatCompletionsCreate).not.toHaveBeenCalled()
    })

    it('应正确解析 AI 返回的 JSON', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              { id: 'kp1', type: 'prerequisite', description: '前置', score: 0.9 },
              { id: 'kp2', type: 'extension', description: '拓展', score: 0.7 },
            ]),
          },
        }],
      })

      const result = await aiModule.suggestKnowledgeRelations({
        target: { title: 'T', content: 'C', tags: ['t1'] },
        candidates: [
          { id: 'kp1', title: 'KP1', content: 'C1', tags: [] },
          { id: 'kp2', title: 'KP2', content: 'C2', tags: [] },
        ],
      })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('kp1')
      expect(result[0].type).toBe('prerequisite')
      expect(result[1].score).toBe(0.7)
    })

    it('应处理包含 ```json 包裹的返回', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{
          message: {
            content: '```json\n[{"id":"kp1","type":"related","description":"d","score":0.5}]\n```',
          },
        }],
      })

      const result = await aiModule.suggestKnowledgeRelations({
        target: { title: 'T', content: 'C', tags: [] },
        candidates: [{ id: 'kp1', title: 'KP1', content: 'C', tags: [] }],
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('kp1')
    })

    it('应在 AI 返回非 JSON 时返回空数组', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '这不是 JSON' } }],
      })

      const result = await aiModule.suggestKnowledgeRelations({
        target: { title: 'T', content: 'C', tags: [] },
        candidates: [{ id: 'kp1', title: 'KP1', content: 'C', tags: [] }],
      })

      expect(result).toEqual([])
    })
  })

  describe('explainWrongQuestion', () => {
    it('应返回结构化解析', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              concept: '概念',
              whyWrong: '错因',
              howToFix: '思路',
              similarTip: '提醒',
            }),
          },
        }],
      })

      const result = await aiModule.explainWrongQuestion({
        question: '1+1=?',
        questionType: 'short',
        myAnswer: '3',
        correctAnswer: '2',
      })

      expect(result.concept).toBe('概念')
      expect(result.whyWrong).toBe('错因')
      expect(result.howToFix).toBe('思路')
      expect(result.similarTip).toBe('提醒')
    })

    it('应在 user 消息中包含题目和答案', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
      })

      await aiModule.explainWrongQuestion({
        question: 'Q1',
        questionType: 'multiple',
        options: '["A","B"]',
        myAnswer: 'A',
        correctAnswer: 'B',
        analysis: '我看错题了',
        knowledgeContext: '知识点:XX',
      })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[1].content).toContain('Q1')
      expect(callArg.messages[1].content).toContain('multiple')
      expect(callArg.messages[1].content).toContain('["A","B"]')
      expect(callArg.messages[1].content).toContain('我看错题了')
      expect(callArg.messages[1].content).toContain('知识点:XX')
    })

    it('应在 AI 返回非 JSON 时将原文放入 concept', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: 'AI 返回的纯文本' } }],
      })

      const result = await aiModule.explainWrongQuestion({
        question: 'Q',
        questionType: 'short',
        myAnswer: 'A',
        correctAnswer: 'B',
      })

      expect(result.concept).toBe('AI 返回的纯文本')
      expect(result.whyWrong).toBe('')
    })
  })

  describe('webSearch', () => {
    it('应在 SDK 返回数组时正确映射', async () => {
      mockFunctionsInvoke.mockResolvedValue([
        { title: 'T1', url: 'http://a', snippet: 'S1' },
        { title: 'T2', url: 'http://b', snippet: 'S2' },
      ])

      const result = await aiModule.webSearch('query', 5)

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('T1')
      expect(result[0].url).toBe('http://a')
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('web_search', {
        query: 'query',
        num: 5,
        recency_days: 365,
      })
    })

    it('应在 SDK 返回 { data: [...] } 时正确映射', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: [
          { name: 'N1', link: 'http://x', summary: 'Sum' },
        ],
      })

      const result = await aiModule.webSearch('q')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('N1')
      expect(result[0].url).toBe('http://x')
      expect(result[0].snippet).toBe('Sum')
    })

    it('应在 SDK 抛错时返回空数组', async () => {
      mockFunctionsInvoke.mockRejectedValue(new Error('network'))

      const result = await aiModule.webSearch('q')

      expect(result).toEqual([])
    })

    it('应在 SDK 返回非数组非对象时返回空数组', async () => {
      mockFunctionsInvoke.mockResolvedValue('invalid')

      const result = await aiModule.webSearch('q')

      expect(result).toEqual([])
    })
  })

  describe('aiSearch', () => {
    it('应同时调用 webSearch 和 chat.completions.create', async () => {
      mockFunctionsInvoke.mockResolvedValue([
        { title: 'T1', url: 'http://a', snippet: 'S1' },
      ])
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '基于搜索的回答 [1]' } }],
      })

      const result = await aiModule.aiSearch({
        query: '勾股定理',
        context: '当前在学几何',
      })

      expect(result.answer).toBe('基于搜索的回答 [1]')
      expect(result.sources).toHaveLength(1)
      expect(result.sources[0].title).toBe('T1')

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[1].content).toContain('勾股定理')
      expect(callArg.messages[1].content).toContain('当前在学几何')
      expect(callArg.messages[1].content).toContain('T1')
    })

    it('应在无搜索结果时仍能给出回答', async () => {
      mockFunctionsInvoke.mockResolvedValue([])
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '无结果回答' } }],
      })

      const result = await aiModule.aiSearch({ query: 'q' })

      expect(result.answer).toBe('无结果回答')
      expect(result.sources).toEqual([])
    })

    it('应在无 context 时不注入上下文段', async () => {
      mockFunctionsInvoke.mockResolvedValue([])
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '回答' } }],
      })

      await aiModule.aiSearch({ query: 'q' })

      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages[1].content).not.toContain('学生上下文')
    })
  })

  describe('chatWithAI', () => {
    it('应将消息透传给 SDK', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '回复' } }],
      })

      const result = await aiModule.chatWithAI([
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hello' },
      ])

      expect(result).toBe('回复')
      const callArg = mockChatCompletionsCreate.mock.calls[0][0]
      expect(callArg.messages).toHaveLength(2)
      expect(callArg.messages[1].content).toBe('hello')
    })

    it('应在 AI 返回空时返回空字符串', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      })

      const result = await aiModule.chatWithAI([{ role: 'user', content: 'q' }])

      expect(result).toBe('')
    })
  })

  describe('generateChatTitle', () => {
    it('应基于首条消息生成标题', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '关于勾股定理' } }],
      })

      const title = await aiModule.generateChatTitle('我想了解勾股定理')

      expect(title).toBe('关于勾股定理')
    })

    it('应去除标题中的引号', async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '「关于数学」' } }],
      })

      const title = await aiModule.generateChatTitle('Q')

      expect(title).toBe('关于数学')
    })

    it('应截断过长的标题', async () => {
      const longTitle = '这是一个非常非常非常非常非常非常非常非常非常非常长的标题'
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: longTitle } }],
      })

      const title = await aiModule.generateChatTitle('Q')

      expect(title.length).toBeLessThanOrEqual(24)
    })

    it('应在 SDK 抛错时返回"新对话"', async () => {
      mockChatCompletionsCreate.mockRejectedValue(new Error('fail'))

      const title = await aiModule.generateChatTitle('Q')

      expect(title).toBe('新对话')
    })
  })
})
