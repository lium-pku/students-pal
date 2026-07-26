import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

vi.mock('@/lib/vault', () => ({
  subjects: { get: vi.fn() },
  knowledge: { list: vi.fn() },
  thinking: { list: vi.fn() },
  wrongQuestions: { list: vi.fn() },
}))

import { subjects, knowledge, thinking, wrongQuestions } from '@/lib/vault'
import { knowledgeMap } from '@/lib/knowledge-map'

const MAPS_DIR = path.join(process.cwd(), 'vault', '.maps')
function cleanMaps() { if (fs.existsSync(MAPS_DIR)) for (const f of fs.readdirSync(MAPS_DIR)) if (f.endsWith('.json')) fs.unlinkSync(path.join(MAPS_DIR, f)) }

describe('lib/knowledge-map.ts (v2.2 多类型节点)', () => {
  beforeEach(() => { cleanMaps(); vi.clearAllMocks() })
  afterEach(() => { cleanMaps() })

  function setupSubject(subjectId = 's1', subjectName = '数学') {
    vi.mocked(subjects.get).mockReturnValue({ id: subjectId, name: subjectName, color: '', icon: null, createdAt: '', updatedAt: '' })
  }

  describe('基础功能', () => {
    it('应在学科不存在时返回 null', () => {
      vi.mocked(subjects.get).mockReturnValue(null)
      expect(knowledgeMap.generate('nonexistent')).toBeNull()
    })

    it('应生成空地图(无知识点)', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      const map = knowledgeMap.generate('s1')
      expect(map!.nodes).toHaveLength(0)
    })

    it('应缓存到文件', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      knowledgeMap.generate('s1')
      expect(fs.existsSync(path.join(MAPS_DIR, 's1.json'))).toBe(true)
    })

    it('有缓存时 get 应返回缓存', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      const generated = knowledgeMap.generate('s1')
      const cached = knowledgeMap.get('s1')
      expect(cached).toEqual(generated)
    })
  })

  describe('知识点节点', () => {
    it('应生成知识点节点(圆形)', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: '勾股定理', content: '', tags: [], subjectId: 's1', mastery: 75, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      const map = knowledgeMap.generate('s1')
      expect(map!.nodes).toHaveLength(1)
      expect(map!.nodes[0].type).toBe('knowledge')
      expect(map!.nodes[0].mastery).toBe(75)
    })

    it('应生成知识点间关联边', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: 'A', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [{ fromId: 'k1', toId: 'k2', type: 'prerequisite', description: '', aiGenerated: false, id: 'r1', createdAt: '' }], relationsTo: [], createdAt: '', updatedAt: '' },
        { id: 'k2', title: 'B', content: '', tags: [], subjectId: 's1', mastery: 60, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      const map = knowledgeMap.generate('s1')
      expect(map!.edges).toHaveLength(1)
      expect(map!.edges[0].type).toBe('prerequisite')
    })
  })

  describe('思考笔记节点(v2.2 新增)', () => {
    it('应生成思考笔记节点(方形)— 有关联的', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: '乘法交换律', content: '', tags: [], subjectId: 's1', mastery: 90, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([
        { id: 't1', title: '为什么负负得正?', question: '', content: '', aiReflection: '', aiMode: 'socratic', status: 'reflected', subjectId: 's1', relatedKnowledgeIds: ['k1'], relatedThinking: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      const map = knowledgeMap.generate('s1')
      const thinkingNode = map!.nodes.find(n => n.type === 'thinking')
      expect(thinkingNode).toBeDefined()
      expect(thinkingNode!.id).toBe('t1')
    })

    it('不应生成无关联的思考笔记节点', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: 'A', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([
        { id: 't1', title: '无关思考', question: '', content: '', aiReflection: '', aiMode: 'socratic', status: 'draft', subjectId: 's1', relatedKnowledgeIds: [], relatedThinking: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      const map = knowledgeMap.generate('s1')
      expect(map!.nodes.find(n => n.type === 'thinking')).toBeUndefined()
    })

    it('应生成知识点→思考的 has-thinking 边', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: '乘法交换律', content: '', tags: [], subjectId: 's1', mastery: 90, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([
        { id: 't1', title: '思考1', question: '', content: '', aiReflection: '', aiMode: 'socratic', status: 'reflected', subjectId: 's1', relatedKnowledgeIds: ['k1'], relatedThinking: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      const map = knowledgeMap.generate('s1')
      const hasThinkingEdge = map!.edges.find(e => e.type === 'has-thinking')
      expect(hasThinkingEdge).toBeDefined()
      expect(hasThinkingEdge!.from).toBe('k1')
      expect(hasThinkingEdge!.to).toBe('t1')
    })

    it('应生成思考→思考的 extends 边', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: 'A', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([
        { id: 't1', title: '思考1', question: '', content: '', aiReflection: '', aiMode: 'socratic', status: 'reflected', subjectId: 's1', relatedKnowledgeIds: ['k1'], relatedThinking: [{ id: 't2', type: 'extends', description: '延伸' }], createdAt: '', updatedAt: '' },
        { id: 't2', title: '思考2', question: '', content: '', aiReflection: '', aiMode: 'socratic', status: 'draft', subjectId: 's1', relatedKnowledgeIds: ['k1'], relatedThinking: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      const map = knowledgeMap.generate('s1')
      const extendsEdge = map!.edges.find(e => e.type === 'extends')
      expect(extendsEdge).toBeDefined()
      expect(extendsEdge!.from).toBe('t1')
      expect(extendsEdge!.to).toBe('t2')
    })
  })

  describe('错题节点(v2.2 新增)', () => {
    it('应生成错题节点(三角形)— 有关联的', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: '乘法交换律', content: '', tags: [], subjectId: 's1', mastery: 90, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([
        { id: 'w1', question: '计算 (-2)×(-3)=?', questionType: 'short', options: '', myAnswer: '-6', correctAnswer: '6', analysis: '', aiExplanation: '', status: 'unresolved', subjectId: 's1', relatedKnowledgeId: 'k1', createdAt: '', updatedAt: '' },
      ])
      const map = knowledgeMap.generate('s1')
      const wrongNode = map!.nodes.find(n => n.type === 'wrong')
      expect(wrongNode).toBeDefined()
      expect(wrongNode!.id).toBe('w1')
    })

    it('不应生成无关联的错题节点', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: 'A', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([
        { id: 'w1', question: '无关联错题', questionType: 'short', options: '', myAnswer: '', correctAnswer: '', analysis: '', aiExplanation: '', status: 'unresolved', subjectId: 's1', relatedKnowledgeId: null, createdAt: '', updatedAt: '' },
      ])
      const map = knowledgeMap.generate('s1')
      expect(map!.nodes.find(n => n.type === 'wrong')).toBeUndefined()
    })

    it('应生成知识点→错题的 has-wrong 边', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: '乘法交换律', content: '', tags: [], subjectId: 's1', mastery: 90, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([
        { id: 'w1', question: '错题1', questionType: 'short', options: '', myAnswer: '', correctAnswer: '', analysis: '', aiExplanation: '', status: 'unresolved', subjectId: 's1', relatedKnowledgeId: 'k1', createdAt: '', updatedAt: '' },
      ])
      const map = knowledgeMap.generate('s1')
      const hasWrongEdge = map!.edges.find(e => e.type === 'has-wrong')
      expect(hasWrongEdge).toBeDefined()
      expect(hasWrongEdge!.from).toBe('k1')
      expect(hasWrongEdge!.to).toBe('w1')
    })
  })

  describe('综合', () => {
    it('应同时包含知识点/思考/错题三种节点', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([
        { id: 'k1', title: '乘法交换律', content: '', tags: [], subjectId: 's1', mastery: 90, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(thinking.list).mockReturnValue([
        { id: 't1', title: '思考', question: '', content: '', aiReflection: '', aiMode: 'socratic', status: 'reflected', subjectId: 's1', relatedKnowledgeIds: ['k1'], relatedThinking: [], createdAt: '', updatedAt: '' },
      ])
      vi.mocked(wrongQuestions.list).mockReturnValue([
        { id: 'w1', question: '错题', questionType: 'short', options: '', myAnswer: '', correctAnswer: '', analysis: '', aiExplanation: '', status: 'unresolved', subjectId: 's1', relatedKnowledgeId: 'k1', createdAt: '', updatedAt: '' },
      ])
      const map = knowledgeMap.generate('s1')
      const types = new Set(map!.nodes.map(n => n.type))
      expect(types.has('knowledge')).toBe(true)
      expect(types.has('thinking')).toBe(true)
      expect(types.has('wrong')).toBe(true)
    })

    it('invalidate 应删除缓存', () => {
      setupSubject()
      vi.mocked(knowledge.list).mockReturnValue([])
      vi.mocked(thinking.list).mockReturnValue([])
      vi.mocked(wrongQuestions.list).mockReturnValue([])
      knowledgeMap.generate('s1')
      knowledgeMap.invalidate('s1')
      expect(fs.existsSync(path.join(MAPS_DIR, 's1.json'))).toBe(false)
    })
  })
})
