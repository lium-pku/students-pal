import { describe, it, expect, vi, afterEach } from 'vitest'
import { api } from '@/lib/types'

describe('lib/types.ts api helper', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应在成功时返回 JSON 数据', async () => {
    const mockData = { ok: true, data: [1, 2, 3] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    }))

    const result = await api('/api/test')
    expect(result).toEqual(mockData)
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }))
  })

  it('应在 fetch 失败时抛出错误(含 API 返回的 error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: '参数错误' }),
    }))

    await expect(api('/api/test')).rejects.toThrow('参数错误')
  })

  it('应在 fetch 失败且无 JSON body 时使用 statusText', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('not JSON') },
    }))

    await expect(api('/api/test')).rejects.toThrow('Internal Server Error')
  })

  it('应传递 method 和 body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }))

    await api('/api/test', {
      method: 'POST',
      body: JSON.stringify({ x: 1 }),
    })

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ x: 1 }),
    }))
  })

  it('应合并自定义 headers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }))

    await api('/api/test', {
      headers: { 'X-Custom': 'value' },
    })

    const call = (fetch as any).mock.calls[0][1]
    expect(call.headers['Content-Type']).toBe('application/json')
    expect(call.headers['X-Custom']).toBe('value')
  })
})
