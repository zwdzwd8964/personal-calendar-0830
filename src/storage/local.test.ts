import type { MockInstance } from 'vitest'
import { SCHEMA_VERSION } from '@/types'
import type { AppData, MealSlot, Task } from '@/types'
import { LocalStorageAdapter, STORAGE_KEY } from './local'

function makeMeal(id: string, overrides: Partial<MealSlot> = {}): MealSlot {
  return {
    id,
    date: '2026-08-30',
    slot: 'lunch',
    person: '张三',
    createdAt: '2026-08-30T08:00:00.000Z',
    updatedAt: '2026-08-30T08:00:00.000Z',
    ...overrides,
  }
}

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: 'task ' + id,
    mode: 'fuzzy',
    status: 'todo',
    important: false,
    urgent: false,
    tags: [],
    checklist: [],
    sortOrder: 1000,
    createdAt: '2026-08-30T08:00:00.000Z',
    updatedAt: '2026-08-30T08:00:00.000Z',
    ...overrides,
  }
}

function storedData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) throw new Error('nothing stored under ' + STORAGE_KEY)
  return JSON.parse(raw) as AppData
}

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter
  let setItemSpy: MockInstance<Storage['setItem']>

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    adapter = new LocalStorageAdapter()
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
  })

  afterEach(() => {
    setItemSpy.mockRestore()
    vi.useRealTimers()
  })

  it('coalesces 3 rapid saves into a single debounced setItem ~300ms later', async () => {
    await adapter.saveMeal(makeMeal('m1'))
    await adapter.saveMeal(makeMeal('m2'))
    await adapter.saveTask(makeTask('t1'))
    expect(setItemSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(299)
    expect(setItemSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(setItemSpy).toHaveBeenCalledTimes(1)

    const data = storedData()
    expect(data.meals.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(data.tasks.map((t) => t.id)).toEqual(['t1'])
  })

  it('resets the debounce timer on consecutive saves (trailing debounce)', async () => {
    await adapter.saveMeal(makeMeal('m1'))
    vi.advanceTimersByTime(200)
    await adapter.saveMeal(makeMeal('m2'))
    vi.advanceTimersByTime(200) // 400ms after first save, but only 200ms after last
    expect(setItemSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100) // 300ms after last save
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    expect(storedData().meals.map((m) => m.id)).toEqual(['m1', 'm2'])
  })

  it('upserts by id: saving with an existing id replaces the record', async () => {
    await adapter.saveMeal(makeMeal('m1', { person: '甲' }))
    await adapter.saveMeal(makeMeal('m1', { person: '乙', place: '食堂' }))
    await adapter.saveTask(makeTask('t1', { title: 'v1' }))
    await adapter.saveTask(makeTask('t1', { title: 'v2' }))
    vi.advanceTimersByTime(300)

    const data = storedData()
    expect(data.meals).toHaveLength(1)
    expect(data.meals[0]).toMatchObject({ id: 'm1', person: '乙', place: '食堂' })
    expect(data.tasks).toHaveLength(1)
    expect(data.tasks[0]).toMatchObject({ id: 't1', title: 'v2' })
  })

  it('deletes by id', async () => {
    await adapter.saveMeal(makeMeal('m1'))
    await adapter.saveMeal(makeMeal('m2'))
    await adapter.saveTask(makeTask('t1'))
    await adapter.deleteMeal('m1')
    await adapter.deleteTask('t1')
    vi.advanceTimersByTime(300)

    const data = storedData()
    expect(data.meals.map((m) => m.id)).toEqual(['m2'])
    expect(data.tasks).toEqual([])
  })

  it('replaceAll writes immediately without waiting for the debounce', async () => {
    await adapter.saveMeal(makeMeal('pending')) // pending debounced write
    const imported: AppData = {
      schemaVersion: SCHEMA_VERSION,
      meals: [makeMeal('imported')],
      tasks: [makeTask('imported-task')],
    }
    await adapter.replaceAll(imported)

    expect(setItemSpy).toHaveBeenCalledTimes(1)
    expect(storedData().meals.map((m) => m.id)).toEqual(['imported'])

    // the pending debounced write was cancelled — nothing overwrites the import later
    vi.advanceTimersByTime(1000)
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    expect(storedData().meals.map((m) => m.id)).toEqual(['imported'])
  })

  it('flush forces a pending write immediately', async () => {
    await adapter.saveTask(makeTask('t1'))
    expect(setItemSpy).not.toHaveBeenCalled()

    adapter.flush()
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    expect(storedData().tasks.map((t) => t.id)).toEqual(['t1'])

    // no pending timer left behind
    vi.advanceTimersByTime(1000)
    expect(setItemSpy).toHaveBeenCalledTimes(1)
  })

  it('load returns fresh empty data when the key is missing', async () => {
    const data = await adapter.load()
    expect(data).toEqual({ schemaVersion: SCHEMA_VERSION, meals: [], tasks: [] })
  })

  it('load returns fresh empty data on corrupt JSON', async () => {
    localStorage.setItem(STORAGE_KEY, '{"schemaVersion": oops')
    const data = await new LocalStorageAdapter().load()
    expect(data).toEqual({ schemaVersion: SCHEMA_VERSION, meals: [], tasks: [] })
  })

  it('load returns fresh empty data on wrong schemaVersion', async () => {
    const stale: AppData = {
      schemaVersion: SCHEMA_VERSION + 1,
      meals: [makeMeal('m1')],
      tasks: [],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stale))
    const data = await new LocalStorageAdapter().load()
    expect(data).toEqual({ schemaVersion: SCHEMA_VERSION, meals: [], tasks: [] })
  })

  it('load returns fresh empty data when meals/tasks are not arrays', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, meals: {}, tasks: [] }),
    )
    const data = await new LocalStorageAdapter().load()
    expect(data).toEqual({ schemaVersion: SCHEMA_VERSION, meals: [], tasks: [] })
  })

  it('load returns fresh empty data on a JSON null payload', async () => {
    localStorage.setItem(STORAGE_KEY, 'null')
    const data = await new LocalStorageAdapter().load()
    expect(data).toEqual({ schemaVersion: SCHEMA_VERSION, meals: [], tasks: [] })
  })

  it('round-trips saved data through localStorage to a fresh adapter', async () => {
    await adapter.saveMeal(makeMeal('m1', { note: '带酒' }))
    await adapter.saveTask(makeTask('t1', { deadline: '2026-09-04', estimateDays: 0.5 }))
    adapter.flush()

    const reloaded = await new LocalStorageAdapter().load()
    expect(reloaded.schemaVersion).toBe(SCHEMA_VERSION)
    expect(reloaded.meals).toEqual([makeMeal('m1', { note: '带酒' })])
    expect(reloaded.tasks).toEqual([makeTask('t1', { deadline: '2026-09-04', estimateDays: 0.5 })])
  })

  it('lazily loads existing data on first mutation instead of clobbering it', async () => {
    const existing: AppData = {
      schemaVersion: SCHEMA_VERSION,
      meals: [makeMeal('old')],
      tasks: [makeTask('old-task')],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    setItemSpy.mockClear()

    const fresh = new LocalStorageAdapter()
    await fresh.saveMeal(makeMeal('new'))
    vi.advanceTimersByTime(300)

    const data = storedData()
    expect(data.meals.map((m) => m.id)).toEqual(['old', 'new'])
    expect(data.tasks.map((t) => t.id)).toEqual(['old-task'])
  })
})
