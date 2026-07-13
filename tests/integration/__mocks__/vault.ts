// Mock for @/lib/vault — 在集成测试中引入此文件即可 mock 文件存储层
import { vi } from 'vitest'

const mockVault = {
  subjects: {
    list: vi.fn(),
    listWithCounts: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  knowledge: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAllRelations: vi.fn(),
    findRelationsByFromId: vi.fn(),
    addRelation: vi.fn(),
    removeRelation: vi.fn(),
    removeRelationByEndpoints: vi.fn(),
    count: vi.fn(),
    aggregateMastery: vi.fn(),
  },
  thinking: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    findRecent: vi.fn(),
  },
  wrongQuestions: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    findRecent: vi.fn(),
  },
  chats: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addMessage: vi.fn(),
  },
  rebuildIndex: vi.fn(),
  initVault: vi.fn(),
}

vi.mock('@/lib/vault', () => mockVault)

export { mockVault }
