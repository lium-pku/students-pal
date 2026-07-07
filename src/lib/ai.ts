import ZAI from 'z-ai-web-dev-sdk'

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

export async function getAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

// ============ 思考笔记 AI 引导 ============

export type ThinkingMode = 'socratic' | 'summarize' | 'challenge' | 'extend'

export interface ThinkingReflectionInput {
  question: string
  content: string
  mode: ThinkingMode
  context?: string // 相关知识点上下文
}

const THINKING_PROMPTS: Record<ThinkingMode, string> = {
  socratic: `你是学生的"思考伙伴"。请用苏格拉底式提问法，通过 3-5 个层层递进的问题，引导学生自己发现思考中的盲点、漏洞或更深层的可能性。
要求：
- 不要直接给出答案或结论
- 问题之间要有递进关系（从具体到抽象，从表面到本质）
- 每个问题后简要说明"为什么要这样问"
- 语气平等、鼓励，而非考试式追问
- 使用 Markdown 格式输出`,
  summarize: `你是学生的"思考镜子"。请用一段精炼的话（150 字内）复述学生思考的核心观点，然后指出 2-3 个值得继续深化的方向。
要求：
- 复述必须忠实于学生原意，不可加入新观点
- 深化方向要具体可操作，例如"可以从反面论证""可以结合 XX 例子验证"
- 使用 Markdown 格式输出`,
  challenge: `你是学生的"理性辩手"。请站在学生的对立面，找出学生思考中 2-3 个最薄弱的环节进行反驳。
要求：
- 反驳必须有理有据，不能为反对而反对
- 每个反驳后给出一个反例或一种"如果...会怎样"的假设
- 末尾用一句话总结"如果你的观点要站得住，需要补充什么"
- 使用 Markdown 格式输出`,
  extend: `你是学生的"知识拓展员"。请基于学生的思考，提供 3 个跨学科或跨主题的延伸思考方向。
要求：
- 延伸方向要具体（点名相关理论、人物、案例），不要泛泛而谈
- 每个延伸说明"为什么这个方向值得探索"
- 末尾推荐 1 本可读的书或一篇可读的文章
- 使用 Markdown 格式输出`,
}

export async function reflectOnThinking(input: ThinkingReflectionInput): Promise<string> {
  const ai = await getAI()
  const systemPrompt = THINKING_PROMPTS[input.mode] || THINKING_PROMPTS.socratic

  const userContent = `【思考的起点 / 问题】
${input.question || '（未填写具体问题）'}

【学生的思考】
${input.content || '（学生还未写下思考内容）'}

${input.context ? `【相关知识点上下文】\n${input.context}\n` : ''}
请按照你的角色设定给出回应。`

  const completion = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    thinking: { type: 'disabled' },
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || '（AI 未返回内容）'
}

// ============ 知识点关联建议 ============

export interface KnowledgeConnectInput {
  target: { title: string; content: string; tags: string[] }
  candidates: { id: string; title: string; content: string; tags: string[] }[]
}

export async function suggestKnowledgeRelations(
  input: KnowledgeConnectInput,
): Promise<{ id: string; type: string; description: string; score: number }[]> {
  if (input.candidates.length === 0) return []

  const ai = await getAI()
  const systemPrompt = `你是一位学科专家，擅长梳理知识网络。给定一个目标知识点和若干候选知识点，请找出真正值得建立的关联，并给出关联类型与简短说明。
关联类型从以下中选择：prerequisite（前置依赖）、extension（拓展延伸）、contrast（对比辨析）、example（典型示例）、related（一般相关）。
仅返回 JSON 数组，不要任何额外文字。每个元素包含：id（候选知识点 id）、type（关联类型）、description（一句话说明，不超过 30 字）、score（0-1 的相关度评分）。`

  const userContent = `【目标知识点】
标题：${input.target.title}
内容：${input.target.content}
标签：${input.target.tags.join(', ')}

【候选知识点】
${input.candidates
  .map(
    (c, i) =>
      `${i + 1}. id=${c.id}\n   标题：${c.title}\n   内容：${c.content.slice(0, 200)}\n   标签：${c.tags.join(', ')}`,
  )
  .join('\n')}

请挑选最值得建立关联的候选（最多 5 个），按相关度从高到低返回。仅返回 JSON。`

  const completion = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    thinking: { type: 'disabled' },
    temperature: 0.3,
  })

  const text = completion.choices[0]?.message?.content || '[]'
  try {
    // 容错：可能含有 ```json ... ``` 包裹
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return []
  }
}

// ============ 错题解析 ============

export interface WrongQuestionExplainInput {
  question: string
  questionType: string
  options?: string
  myAnswer: string
  correctAnswer: string
  analysis?: string // 学生自填错因
  knowledgeContext?: string
}

export async function explainWrongQuestion(
  input: WrongQuestionExplainInput,
): Promise<{ concept: string; whyWrong: string; howToFix: string; similarTip: string }> {
  const ai = await getAI()
  const systemPrompt = `你是一位耐心的学科辅导老师。请针对学生的错题，给出结构化解析。
要求：
1. concept：先回顾题目考查的核心知识点（不超过 80 字）
2. whyWrong：分析学生答案错在哪里、为什么这样想会出错（不超过 120 字）
3. howToFix：给出正确的解题思路，关键步骤分明（不超过 200 字）
4. similarTip：给出一个易混淆的提醒，帮助学生避免类似错误（不超过 50 字）
仅返回 JSON 对象，键名为 concept/whyWrong/howToFix/similarTip，不要任何额外文字。`

  const userContent = `【题目】${input.question}
【题型】${input.questionType}
${input.options ? `【选项】${input.options}` : ''}
【学生答案】${input.myAnswer || '（未作答）'}
【正确答案】${input.correctAnswer || '（未提供）'}
${input.analysis ? `【学生自填错因】${input.analysis}` : ''}
${input.knowledgeContext ? `【相关知识点】${input.knowledgeContext}` : ''}

请按格式返回 JSON。`

  const completion = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    thinking: { type: 'disabled' },
    temperature: 0.4,
  })

  const text = completion.choices[0]?.message?.content || '{}'
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      concept: text,
      whyWrong: '',
      howToFix: '',
      similarTip: '',
    }
  }
}

// ============ 联网搜索 ============

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export async function webSearch(query: string, num = 5): Promise<SearchResult[]> {
  const ai = await getAI()
  try {
    const result = await ai.functions.invoke('web_search', {
      query,
      num,
      recency_days: 365,
    })
    // SDK 返回结构可能为数组或对象，做容错
    if (Array.isArray(result)) {
      return result.map((r: any) => ({
        title: r.title || r.name || '',
        url: r.url || r.link || '',
        snippet: r.snippet || r.description || r.summary || '',
      }))
    }
    if (result?.data && Array.isArray(result.data)) {
      return result.data.map((r: any) => ({
        title: r.title || r.name || '',
        url: r.url || r.link || '',
        snippet: r.snippet || r.description || r.summary || '',
      }))
    }
    return []
  } catch (err) {
    console.error('web_search error:', err)
    return []
  }
}

// ============ AI 搜索 + 综合回答 ============

export interface AiSearchInput {
  query: string
  context?: string // 学生当前所在模块的上下文
}

export async function aiSearch(input: AiSearchInput): Promise<{
  answer: string
  sources: SearchResult[]
}> {
  const [results, ai] = await Promise.all([webSearch(input.query, 5), getAI()])

  const sourcesText =
    results.length > 0
      ? results
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
          .join('\n\n')
      : '（未找到相关搜索结果）'

  const systemPrompt = `你是学生的学习助手。请基于联网搜索的结果回答学生的问题。
要求：
- 回答要清晰、准确，符合学生的认知水平
- 引用搜索结果时使用 [1]、[2] 这样的标记
- 如果问题需要解题思路，请给出关键步骤而非直接答案
- 末尾列出参考来源
- 使用 Markdown 格式输出`

  const userContent = `${input.context ? `【学生上下文】\n${input.context}\n\n` : ''}【学生问题】
${input.query}

【联网搜索结果】
${sourcesText}`

  const completion = await ai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    thinking: { type: 'disabled' },
    temperature: 0.5,
  })

  return {
    answer: completion.choices[0]?.message?.content || '（AI 未返回内容）',
    sources: results,
  }
}

// ============ 通用 AI 对话（带流式支持） ============

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function chatWithAI(messages: ChatTurn[]): Promise<string> {
  const ai = await getAI()
  const completion = await ai.chat.completions.create({
    messages: messages as any,
    thinking: { type: 'disabled' },
    temperature: 0.6,
  })
  return completion.choices[0]?.message?.content || ''
}

// ============ 自动生成对话标题 ============

export async function generateChatTitle(firstUserMessage: string): Promise<string> {
  try {
    const ai = await getAI()
    const completion = await ai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: '请为以下用户消息生成一个不超过 16 字的中文对话标题，只返回标题文字，不要引号和任何额外内容。',
        },
        { role: 'user', content: firstUserMessage.slice(0, 500) },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.3,
    })
    const title = (completion.choices[0]?.message?.content || '新对话').trim()
    return title.replace(/^["「『]|["」』]$/g, '').slice(0, 24)
  } catch {
    return '新对话'
  }
}
