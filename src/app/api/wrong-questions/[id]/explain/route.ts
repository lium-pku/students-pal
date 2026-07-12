import { NextRequest, NextResponse } from 'next/server'
import { wrongQuestions, knowledge } from '@/lib/vault'
import { explainWrongQuestion } from '@/lib/ai'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = wrongQuestions.get(id)
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })

  try {
    const relatedKp = item.relatedKnowledgeId ? knowledge.get(item.relatedKnowledgeId) : null
    const result = await explainWrongQuestion({
      question: item.question,
      questionType: item.questionType,
      options: item.options,
      myAnswer: item.myAnswer,
      correctAnswer: item.correctAnswer,
      analysis: item.analysis,
      knowledgeContext: relatedKp
        ? `${relatedKp.title}: ${relatedKp.content.slice(0, 200)}`
        : '',
    })

    const markdown = `## 知识点回顾
${result.concept}

## 错因分析
${result.whyWrong}

## 正确思路
${result.howToFix}

## 易错提醒
${result.similarTip}`

    const updated = wrongQuestions.update(id, { aiExplanation: markdown, status: 'reviewed' })
    return NextResponse.json({ explanation: markdown, structured: result, item: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI failed' }, { status: 500 })
  }
}
