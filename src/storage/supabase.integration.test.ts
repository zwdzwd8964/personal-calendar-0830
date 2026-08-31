// 云端集成测试：需要真实 Supabase 项目 + 专用测试账号，全部经 process.env 传入
// （SB_TEST_URL / SB_TEST_KEY / SB_TEST_EMAIL / SB_TEST_PASSWORD），未配置时整组跳过。
// 与 import.meta.env 无关——单元测试环境已在 vite.config.ts 里强制本地模式。
// 测试账号的数据经 RLS 与真实账号完全隔离，收尾清空。运行方式见 docs/DEPLOY.md。
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MealSlot, Task } from '@/types'
import { buildSeed } from '@/lib/seed'
import { todayISO } from '@/lib/dates'
import { SupabaseAdapter } from './supabase'

const url = process.env.SB_TEST_URL ?? ''
const key = process.env.SB_TEST_KEY ?? ''
const email = process.env.SB_TEST_EMAIL ?? ''
const password = process.env.SB_TEST_PASSWORD ?? ''
const enabled = url !== '' && key !== '' && email !== '' && password !== ''

const NET_TIMEOUT = 30000

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : 1))
}

describe.skipIf(!enabled)('SupabaseAdapter cloud integration', () => {
  let client: SupabaseClient
  let adapter: SupabaseAdapter
  const empty = { schemaVersion: 1, meals: [] as MealSlot[], tasks: [] as Task[] }

  beforeAll(async () => {
    client = createClient(url, key)
    adapter = new SupabaseAdapter(() => client)
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw new Error(`test-account sign-in failed: ${error.message}`)
  }, NET_TIMEOUT)

  afterAll(async () => {
    await adapter.replaceAll(empty)
    await client.auth.signOut()
  }, NET_TIMEOUT)

  it(
    'replaceAll -> load round-trips the full seed shape (migration drill)',
    async () => {
      const seed = buildSeed(todayISO())
      await adapter.replaceAll(seed)
      const loaded = await adapter.load()
      expect(sortById(loaded.meals)).toEqual(sortById(seed.meals))
      expect(sortById(loaded.tasks)).toEqual(sortById(seed.tasks))
    },
    NET_TIMEOUT,
  )

  it(
    'upsert updates in place and delete removes across a fresh load (cross-session persistence)',
    async () => {
      const seed = buildSeed(todayISO())
      await adapter.replaceAll(seed)
      const victim = seed.tasks[0]
      const edited: Task = { ...victim, title: '云端改名', updatedAt: new Date().toISOString() }
      await adapter.saveTask(edited)
      await adapter.deleteMeal(seed.meals[0].id)

      // 全新 adapter 实例 = 模拟换会话/换浏览器后重新拉取
      const fresh = await new SupabaseAdapter(() => client).load()
      expect(fresh.tasks.find((t) => t.id === victim.id)?.title).toBe('云端改名')
      expect(fresh.meals.some((m) => m.id === seed.meals[0].id)).toBe(false)
      expect(fresh.meals).toHaveLength(seed.meals.length - 1)
    },
    NET_TIMEOUT,
  )

  it(
    'replaceAll(empty) clears everything (clear-all backing)',
    async () => {
      await adapter.replaceAll(empty)
      const loaded = await adapter.load()
      expect(loaded.meals).toEqual([])
      expect(loaded.tasks).toEqual([])
    },
    NET_TIMEOUT,
  )
})

// 无凭据时保底：让本文件在跳过模式下也有一个可见的说明性断言
describe.skipIf(enabled)('SupabaseAdapter cloud integration (skipped)', () => {
  it('skipped — set SB_TEST_URL / SB_TEST_KEY / SB_TEST_EMAIL / SB_TEST_PASSWORD to enable', () => {
    expect(enabled).toBe(false)
  })
})
