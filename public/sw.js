// 双轨备忘录 Service Worker（手写，零依赖 · CLAUDE.md §13 P2）
// 策略：导航请求 network-first（在线永远拿最新 shell，离线回退缓存）；
// 同源静态资源 cache-first（vite 产物带内容哈希，天然不可变）。
const CACHE = 'dtm-shell-v1'
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(SHELL)
      // 首次访问时页面的资源请求不经过 SW（尚未接管），只缓存 '/' 会导致
      // 「装完立刻断网」白屏——install 时解析 shell 里的哈希资源一并预缓存
      try {
        const res = await cache.match('/')
        const html = await res.text()
        const assets = [...html.matchAll(/"(\/assets\/[^"]+)"/g)].map((m) => m[1])
        if (assets.length > 0) await cache.addAll(assets)
      } catch {
        // 资源预缓存尽力而为；运行时 cache-first 会在下次在线访问补齐
      }
      await self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // supabase 等跨域请求不经缓存

  // 缓存匹配一律 ignoreVary：预缓存（no-cors、无 Origin 头）与页面 cors 请求
  // 会被服务器的 Vary: Origin 判成不同条目，导致离线时明明有缓存却未命中
  const MATCH_OPTS = { ignoreVary: true }

  // SPA 导航：network-first，离线回退缓存的 shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/', MATCH_OPTS)),
    )
    return
  }

  // 静态资源：cache-first（哈希文件名不可变），未命中再走网络并回填
  event.respondWith(
    caches.match(request, MATCH_OPTS).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
