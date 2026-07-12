import { NextRequest, NextResponse } from 'next/server'
import { chats } from '@/lib/vault'
import { chatWithAI, generateChatTitle, ChatTurn } from '@/lib/ai'

// 获取会话列表
export async function GET() {
  const sessions = chats.list().map((s) => ({
    id: s.id,
    title: s.title,
    context: s.context,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messages: s.messages.slice(0, 1),
  }))
  return NextResponse.json(sessions)
}

// 创建会话
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const session = chats.create({
    title: body.title || '新对话',
    context: body.context ? JSON.stringify(body.context) : '',
  })
  return NextResponse.json(session, { status: 201 })
}

// 发送一条消息并获取 AI 回复
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { sessionId, content, contextType } = body
  if (!sessionId || !content) {
    return NextResponse.json({ error: 'sessionId and content are required' }, { status: 400 })
  }

  const session = chats.get(sessionId)
  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

  // 保存用户消息
  const userMsg = chats.addMessage(sessionId, {
    role: 'user',
    content,
    meta: '',
    createdAt: new Date().toISOString(),
  })

  // 构建上下文
  const systemPrompt = buildSystemPrompt(contextType)
  const history: ChatTurn[] = [{ role: 'system', content: systemPrompt }]
  for (const m of session.messages) {
    if (m.role === 'user' || m.role === 'assistant') {
      history.push({ role: m.role as any, content: m.content })
    }
  }
  history.push({ role: 'user', content })

  // 调用 AI
  let aiReply = ''
  let meta = ''
  try {
    aiReply = await chatWithAI(history)
  } catch (err: any) {
    aiReply = `抱歉，AI 暂时不可用：${err.message || '未知错误'}`
  }

  const aiMsg = chats.addMessage(sessionId, {
    role: 'assistant',
    content: aiReply,
    meta,
    createdAt: new Date().toISOString(),
  })

  // 如果是第一条用户消息且标题还是默认值,自动生成标题
  if (session.title === '新对话' && session.messages.length === 0) {
    const newTitle = await generateChatTitle(content)
    chats.update(sessionId, { title: newTitle })
  }

  return NextResponse.json({ userMsg, aiMsg })
}

function buildSystemPrompt(contextType?: string): string {
  const base = `你是一位耐心的学习伙伴，名叫"学伴"。你的角色是：
1. 帮学生梳理想法，而不是直接给答案
2. 用清晰的中文回答，关键步骤分明
3. 涉及概念时给出简短的定义，避免假设学生已知
4. 如果学生的问题模糊，先反问澄清再回答
5. 适当鼓励学生，但不要说教
回答使用 Markdown 格式。`

  if (!contextType) return base
  try {
    const ctx = JSON.parse(contextType)
    if (ctx.type === 'knowledge' && ctx.title) {
      return `${base}\n\n当前学生正在查看知识点《${ctx.title}》。${ctx.content ? `知识点内容：${ctx.content.slice(0, 200)}` : ''}请在回答中适当结合该知识点。`
    }
    if (ctx.type === 'thinking' && ctx.title) {
      return `${base}\n\n当前学生正在写思考笔记《${ctx.title}》。请尊重学生的独立思考，提供引导而非结论。`
    }
    if (ctx.type === 'wrong' && ctx.title) {
      return `${base}\n\n当前学生正在查看错题《${ctx.title.slice(0, 80)}》。如果学生提问，请结合这道错题给予针对性解答。`
    }
  } catch {}
  return base
}
