// Service Worker — 学伴 PWA
// 策略:
//   - 静态资源(JS/CSS/图片/图标): 缓存优先,stale-while-revalidate
//   - API 请求: 网络优先,失败时返回缓存(若有)
//   - 页面导航(HTML): 网络优先,失败时返回离线兜底页
//   - 离线兜底页: 一个简单的提示页,告诉用户当前离线

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `xueban-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `xueban-runtime-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'

// 预缓存的资源(安装时缓存)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ============ 安装:预缓存核心资源 ============
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // 预缓存失败不阻塞安装
        console.warn('[SW] 预缓存部分失败:', err)
      })
    })
  )
  self.skipWaiting()
})

// ============ 激活:清理旧缓存 ============
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// ============ 请求拦截:不同策略 ============
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 只处理同源请求
  if (url.origin !== self.location.origin) return

  // 跳过 Next.js HMR 和开发资源
  if (url.pathname.startsWith('/_next/webpack-hmr')) return
  if (url.pathname.includes('hot-update')) return

  // API 请求:网络优先,失败时返回缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE))
    return
  }

  // 页面导航(HTML):网络优先,失败时返回离线页
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE).catch(() => {
        return caches.match(OFFLINE_URL)
      })
    )
    return
  }

  // 静态资源:stale-while-revalidate
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }

  // 其他请求:网络优先,失败时返回缓存
  event.respondWith(networkFirst(request, RUNTIME_CACHE))
})

// ============ 策略实现 ============

// 网络优先:先尝试网络,失败时用缓存
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const networkResponse = await fetch(request)
    // 只缓存成功的 GET 请求
    if (request.method === 'GET' && networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (err) {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) return cachedResponse
    throw err
  }
}

// Stale-while-revalidate:先返回缓存,后台更新
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => cachedResponse)

  return cachedResponse || fetchPromise
}

// ============ 消息通信:允许前端触发更新 ============
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
