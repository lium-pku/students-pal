import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { explainWrongQuestion } from '@/lib/ai'

// 让 AI 解析错题
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await db.wrongQuestion.findUnique({
    where: { id },
    include: { relatedKnowledge: true },
  })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })

  try {
    const result = await explainWrongQuestion({
      question: item.question,
      questionType: item.questionType,
      options: item.options,
      myAnswer: item.myAnswer,
      correctAnswer: item.correctAnswer,
      analysis: item.analysis,
      knowledgeContext: item.relatedKnowledge
        ? `${item.relatedKnowledge.title}: ${item.relatedKnowledge.content.slice(0, 200)}`
        : '',
    })

    // 组装 Markdown 文本，方便前端展示
    const markdown = `## 知识点回顾
${result.concept}

## 错因分析
${result.whyWrong}

## 正确思路
${result.howToFix}

## 易错提醒
${result.similarTip}`

    const updated = await db.wrongQuestion.update({
      where: { id },
      data: { aiExplanation: markdown, status: 'reviewed' },
    })
    return NextResponse.json({ explanation: markdown, structured: result, item: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI failed' }, { status: 500 })
  }
}
