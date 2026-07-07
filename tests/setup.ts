import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// 全局 mock next/headers 等(若用到)
// 这里暂时不需要

// jsdom 不实现 matchMedia,某些组件可能用到
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// jsdom 不实现 ResizeObserver
if (!global.ResizeObserver) {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

// jsdom 不实现 IntersectionObserver
if (!global.IntersectionObserver) {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: vi.fn(() => []),
  }))
}

// scrollTo 在 jsdom 中是 no-op,但某些组件会调用
if (!window.scrollTo) {
  window.scrollTo = vi.fn()
}

// scrollIntoView 在 jsdom 中未实现
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}
