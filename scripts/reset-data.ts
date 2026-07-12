/**
 * 测试数据重置脚本(v2.0 文件存储版)
 *
 * 用途:
 *   1. 清空 vault/ 目录下所有 Markdown 文件
 *   2. 注入一组"演示数据"
 *
 * 使用场景:
 *   - 每次 E2E 测试运行后清理残留
 *   - 开发者手动重置:`bun run db:seed`
 *   - Agent 完成任务前的清理步骤
 */

import fs from 'fs'
import path from 'path'
import { subjects, knowledge, thinking, wrongQuestions, chats, rebuildIndex } from '../src/lib/vault'

const VAULT_DIR = path.join(process.cwd(), 'vault')

// ============ 演示数据定义 ============

const DEMO_SUBJECTS = [
  { id: 'subj_math', name: '数学', color: '#16a34a', icon: '📐' },
  { id: 'subj_physics', name: '物理', color: '#dc2626', icon: '⚛️' },
  { id: 'subj_english', name: '英语', color: '#7c3aed', icon: '📚' },
]

const DEMO_KNOWLEDGE = [
  {
    id: 'kp_pythagorean',
    title: '勾股定理',
    content: '直角三角形两直角边的平方和等于斜边的平方:\n\n**a² + b² = c²**\n\n其中 c 为斜边。这是欧几里得几何中最基础的定理之一,由古希腊数学家毕达哥拉斯发现(公元前 6 世纪)。',
    tags: ['几何', '定理', '初中'],
    subjectId: 'subj_math',
    mastery: 75,
  },
  {
    id: 'kp_number_line',
    title: '数轴',
    content: '数轴是表示实数的一条直线,规定了:\n\n1. **原点**(0)\n2. **正方向**(通常向右)\n3. **单位长度**\n\n正数在原点右侧,负数在左侧。数轴是理解有理数运算的重要工具。',
    tags: ['几何', '有理数', '初中'],
    subjectId: 'subj_math',
    mastery: 90,
  },
  {
    id: 'kp_multiplication',
    title: '乘法交换律',
    content: '**a × b = b × a**\n\n乘法运算的结果与因子的顺序无关。这是乘法的基本运算律之一,与结合律、分配律共同构成乘法运算的基础。',
    tags: ['运算律', '初中'],
    subjectId: 'subj_math',
    mastery: 95,
  },
  {
    id: 'kp_newton_second',
    title: '牛顿第二定律',
    content: '物体的加速度与所受合外力成正比,与物体质量成反比:\n\n**F = ma**\n\n其中 F 为合外力(N),m 为质量(kg),a 为加速度(m/s²)。',
    tags: ['力学', '定律', '高中'],
    subjectId: 'subj_physics',
    mastery: 60,
  },
  {
    id: 'kp_inertia',
    title: '惯性',
    content: '物体保持原有运动状态的性质称为惯性。质量是惯性大小的唯一量度。\n\n- 静止的物体保持静止\n- 运动的物体保持匀速直线运动\n- 除非受到合外力作用',
    tags: ['力学', '概念', '高中'],
    subjectId: 'subj_physics',
    mastery: 80,
  },
  {
    id: 'kp_present_perfect',
    title: '现在完成时',
    content: '结构: **have/has + 过去分词**\n\n用法:\n1. 表示过去发生且对现在有影响的动作\n2. 表示从过去持续到现在的动作\n\n关键词: already, yet, ever, never, since, for',
    tags: ['时态', '语法', '高中'],
    subjectId: 'subj_english',
    mastery: 70,
  },
]

const DEMO_RELATIONS = [
  { fromId: 'kp_number_line', toId: 'kp_pythagorean', type: 'related', description: '数轴可用于表示勾股定理中的边长', aiGenerated: true },
  { fromId: 'kp_pythagorean', toId: 'kp_multiplication', type: 'related', description: '勾股定理中涉及平方运算', aiGenerated: true },
  { fromId: 'kp_inertia', toId: 'kp_newton_second', type: 'prerequisite', description: '理解惯性是理解牛顿第二定律的前提', aiGenerated: false },
]

const DEMO_THINKING = [
  {
    id: 'thinking_negative_times_negative',
    title: '为什么负负得正?',
    question: '学生在学负数运算时总是问:为什么 -2 × -3 = 6?',
    content: '我觉得负负得正有点像"否定否定就是肯定",比如说"我不讨厌你"等于"我喜欢你"。但这是不是只是一个类比?数学上凭什么这样规定?',
    aiReflection: `## 关于负数乘法的思考伙伴对话

让我们一起来思考为什么 -2 × -3 = 6 吧。

### 第一个问题
你能想到一个具体的例子,说明负数乘法在现实生活中是如何应用的吗?

**为什么要这样问**:通过联系实际生活中的例子,可以帮助我们更好地理解抽象的数学概念,而不是仅仅记住规则。

### 第二个问题
如果我们把乘法理解为"重复相加",那么 -2 × -3 可以如何用加法来表示呢?

**为什么要这样问**:这个问题将引导我们从乘法的基本定义出发,思考负数相乘的直观含义。

### 第三个问题
在数轴上,正数和负数分别代表不同的方向,你认为两个负数相乘会怎样影响这个方向呢?

**为什么要这样问**:从几何角度理解负数运算,将抽象概念可视化。

期待你的思考!`,
    aiMode: 'socratic',
    status: 'reflected',
    subjectId: 'subj_math',
  },
  {
    id: 'thinking_speed_of_light',
    title: '光速为什么是不可超越的?',
    question: '看到科幻电影里的曲速引擎,想知道为什么物理学家说光速是宇宙的速度上限?',
    content: '',
    aiReflection: '',
    aiMode: 'socratic',
    status: 'draft',
    subjectId: 'subj_physics',
  },
]

const DEMO_WRONG = [
  {
    id: 'wq_negative_mult',
    question: '计算: (-2) × (-3) = ?',
    questionType: 'short',
    options: '',
    myAnswer: '-6',
    correctAnswer: '6',
    analysis: '我以为是负数相乘结果还是负的',
    aiExplanation: `## 知识点回顾
负数乘法法则:两数相乘,同号得正,异号得负。

## 错因分析
学生混淆了负数乘法的符号规则,认为负数相乘结果仍为负数。实际上两个负数相乘结果应为正数。

## 正确思路
1. **确定符号**: (-2)×(-3) 是两个负数相乘,根据"同号得正",结果为正数
2. **计算绝对值**: 2×3 = 6
3. **结合符号**: 结果为 +6

## 易错提醒
负数乘法:负负得正,正负得负。`,
    status: 'reviewed',
    subjectId: 'subj_math',
    relatedKnowledgeId: 'kp_multiplication',
  },
  {
    id: 'wq_newton_second',
    question: '一个 2kg 的物体受到 10N 的水平拉力,其加速度是多少?',
    questionType: 'short',
    options: '',
    myAnswer: '20 m/s²',
    correctAnswer: '5 m/s²',
    analysis: '',
    aiExplanation: '',
    status: 'unresolved',
    subjectId: 'subj_physics',
    relatedKnowledgeId: 'kp_newton_second',
  },
]

// ============ 重置逻辑 ============

export async function resetData() {
  console.log('🧹 开始清空 vault/ 目录...')

  // 清空所有 .md 文件(保留目录结构)
  for (const subdir of ['subjects', 'knowledge', 'thinking', 'wrong', 'chats']) {
    const dir = path.join(VAULT_DIR, subdir)
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith('.md')) {
          fs.unlinkSync(path.join(dir, file))
        }
      }
    }
  }
  // 删除索引
  const indexFile = path.join(VAULT_DIR, '.index.json')
  if (fs.existsSync(indexFile)) fs.unlinkSync(indexFile)
  console.log('   ✓ 已清空所有 Markdown 文件')

  console.log('🌱 开始注入演示数据...')

  // 注入学科
  for (const s of DEMO_SUBJECTS) {
    subjects.create({ id: s.id, name: s.name, color: s.color, icon: s.icon })
  }
  console.log(`   ✓ 注入 ${DEMO_SUBJECTS.length} 个学科`)

  // 注入知识点
  for (const kp of DEMO_KNOWLEDGE) {
    knowledge.create({
      id: kp.id,
      title: kp.title,
      content: kp.content,
      tags: kp.tags,
      subjectId: kp.subjectId,
      mastery: kp.mastery,
    })
  }
  console.log(`   ✓ 注入 ${DEMO_KNOWLEDGE.length} 个知识点`)

  // 注入关联
  for (const r of DEMO_RELATIONS) {
    knowledge.addRelation({
      fromId: r.fromId,
      toId: r.toId,
      type: r.type,
      description: r.description,
      aiGenerated: r.aiGenerated,
    })
  }
  console.log(`   ✓ 注入 ${DEMO_RELATIONS.length} 条知识点关联`)

  // 注入思考笔记
  for (const n of DEMO_THINKING) {
    const note = thinking.create({
      id: n.id,
      title: n.title,
      question: n.question,
      content: n.content,
      subjectId: n.subjectId,
    })
    // 更新 AI 引导内容(因为 create 不支持设置 aiReflection)
    thinking.update(note.id, {
      aiReflection: n.aiReflection,
      aiMode: n.aiMode,
      status: n.status,
    })
  }
  console.log(`   ✓ 注入 ${DEMO_THINKING.length} 条思考笔记`)

  // 注入错题
  for (const w of DEMO_WRONG) {
    const wq = wrongQuestions.create({
      id: w.id,
      question: w.question,
      questionType: w.questionType,
      options: w.options,
      myAnswer: w.myAnswer,
      correctAnswer: w.correctAnswer,
      analysis: w.analysis,
      subjectId: w.subjectId,
      relatedKnowledgeId: w.relatedKnowledgeId,
    })
    // 更新 AI 解析
    if (w.aiExplanation) {
      wrongQuestions.update(wq.id, { aiExplanation: w.aiExplanation, status: w.status })
    }
  }
  console.log(`   ✓ 注入 ${DEMO_WRONG.length} 道错题`)

  // 注入 AI 对话会话
  const session = chats.create({ title: '关于勾股定理的讨论' })
  chats.addMessage(session.id, {
    role: 'user',
    content: '勾股定理只能用于直角三角形吗?',
    meta: '',
    createdAt: new Date().toISOString(),
  })
  chats.addMessage(session.id, {
    role: 'assistant',
    content: '好问题!勾股定理本身确实只适用于直角三角形。但有趣的是,对于任意三角形,有一个推广叫**余弦定理**:\n\nc² = a² + b² - 2ab·cos(C)\n\n当 C = 90° 时,cos(90°) = 0,余弦定理就退化成了勾股定理。所以勾股定理可以看作余弦定理的特例。\n\n你想继续了解余弦定理吗?',
    meta: '',
    createdAt: new Date().toISOString(),
  })
  console.log(`   ✓ 注入 1 个 AI 对话会话(2 条消息)`)

  rebuildIndex()
  console.log('\n✅ 数据重置完成!')
  console.log('   演示数据包含:')
  console.log('   • 3 个学科(数学/物理/英语)')
  console.log('   • 6 个知识点(含 3 条关联)')
  console.log('   • 2 条思考笔记(1 条已 AI 引导)')
  console.log('   • 2 道错题(1 道已 AI 解析)')
  console.log('   • 1 个 AI 对话会话(含 2 条消息)')
}

export async function clearData() {
  console.log('🧹 清空所有 Markdown 文件(不注入演示数据)...')
  for (const subdir of ['subjects', 'knowledge', 'thinking', 'wrong', 'chats']) {
    const dir = path.join(VAULT_DIR, subdir)
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith('.md')) {
          fs.unlinkSync(path.join(dir, file))
        }
      }
    }
  }
  const indexFile = path.join(VAULT_DIR, '.index.json')
  if (fs.existsSync(indexFile)) fs.unlinkSync(indexFile)
  rebuildIndex()
  console.log('✅ 已清空')
}

// ============ CLI 入口 ============

const isMainModule = (() => {
  try {
    return require.main === module
  } catch {
    return false
  }
})()

if (isMainModule) {
  const mode = process.argv[2]
  const run = mode === '--clear-only' ? clearData : resetData
  run().catch((e) => {
    console.error('失败:', e)
    process.exit(1)
  })
}
