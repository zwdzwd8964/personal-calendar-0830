import type { SupabaseClient } from '@supabase/supabase-js'
import { SCHEMA_VERSION } from '@/types'
import type { MealSlot, Task } from '@/types'
import { SupabaseAdapter, mealFromRow, mealToRow, taskFromRow, taskToRow } from './supabase'
import type { MealRow, TaskRow } from './supabase'

const fullMeal: MealSlot = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  date: '2026-08-30',
  slot: 'lunch',
  person: '老张',
  place: '公司楼下',
  note: '聊排期',
  createdAt: '2026-08-30T04:00:00.000Z',
  updatedAt: '2026-08-30T05:00:00.000Z',
}

const minimalMeal: MealSlot = {
  id: 'aaaaaaaa-0000-0000-0000-000000000002',
  date: '2026-08-31',
  slot: 'dinner',
  person: '小李',
  createdAt: '2026-08-30T04:00:00.000Z',
  updatedAt: '2026-08-30T04:00:00.000Z',
}

const fullTask: Task = {
  id: 'bbbbbbbb-0000-0000-0000-000000000001',
  title: '提交材料',
  mode: 'firm',
  status: 'done',
  important: true,
  urgent: false,
  size: 'M',
  deadline: '2026-09-04',
  estimateDays: 0.5,
  tags: ['行政', '税务'],
  checklist: [{ id: 'c1', text: '打印', done: true }],
  sortOrder: 2000,
  note: '备注',
  doneAt: '2026-08-30T10:00:00.000Z',
  createdAt: '2026-08-29T02:00:00.000Z',
  updatedAt: '2026-08-30T10:00:00.000Z',
}

const minimalTask: Task = {
  id: 'bbbbbbbb-0000-0000-0000-000000000002',
  title: '想法',
  mode: 'fuzzy',
  status: 'todo',
  important: false,
  urgent: false,
  tags: [],
  checklist: [],
  sortOrder: 1000,
  createdAt: '2026-08-29T02:00:00.000Z',
  updatedAt: '2026-08-29T02:00:00.000Z',
}

interface Call {
  table?: string
  op: string
  args: unknown
}

function makeMockClient(
  selectData: { meals?: MealRow[]; tasks?: TaskRow[] } = {},
  withError = false,
) {
  const calls: Call[] = []
  const error = withError ? { message: 'boom' } : null
  const raw = {
    from(table: 'meals' | 'tasks') {
      return {
        select: (columns: string) => {
          calls.push({ table, op: 'select', args: columns })
          return Promise.resolve({ data: selectData[table] ?? [], error })
        },
        upsert: (row: unknown) => {
          calls.push({ table, op: 'upsert', args: row })
          return Promise.resolve({ error })
        },
        delete: () => ({
          eq: (column: string, value: unknown) => {
            calls.push({ table, op: 'delete', args: [column, value] })
            return Promise.resolve({ error })
          },
        }),
      }
    },
    rpc: (name: string, args: unknown) => {
      calls.push({ op: `rpc:${name}`, args })
      return Promise.resolve({ error })
    },
  }
  return { client: raw as unknown as SupabaseClient, calls }
}

describe('row mapping', () => {
  it('round-trips a full meal and a full task', () => {
    expect(mealFromRow(mealToRow(fullMeal))).toEqual(fullMeal)
    expect(taskFromRow(taskToRow(fullTask))).toEqual(fullTask)
  })

  it('maps absent optional fields to null and back to truly-absent keys', () => {
    const mealRow = mealToRow(minimalMeal)
    expect(mealRow.place).toBeNull()
    expect(mealRow.note).toBeNull()
    const meal = mealFromRow(mealRow)
    expect(meal).toEqual(minimalMeal)
    expect('place' in meal).toBe(false)
    expect('note' in meal).toBe(false)

    const taskRow = taskToRow(minimalTask)
    expect(taskRow.size).toBeNull()
    expect(taskRow.deadline).toBeNull()
    expect(taskRow.estimate_days).toBeNull()
    expect(taskRow.done_at).toBeNull()
    const task = taskFromRow(taskRow)
    expect(task).toEqual(minimalTask)
    expect('doneAt' in task).toBe(false)
  })

  it('normalizes +00:00 timestamptz output to toISOString Z form', () => {
    const row = { ...mealToRow(fullMeal), created_at: '2026-08-30T04:00:00+00:00' }
    expect(mealFromRow(row).createdAt).toBe('2026-08-30T04:00:00.000Z')
    const taskRow = { ...taskToRow(fullTask), done_at: '2026-08-30T10:00:00+00:00' }
    expect(taskFromRow(taskRow).doneAt).toBe('2026-08-30T10:00:00.000Z')
  })

  it('keeps fractional estimate_days as a number', () => {
    expect(taskFromRow(taskToRow(fullTask)).estimateDays).toBe(0.5)
  })
})

describe('SupabaseAdapter contract', () => {
  it('load selects both tables and maps rows into AppData', async () => {
    const { client, calls } = makeMockClient({
      meals: [mealToRow(fullMeal)],
      tasks: [taskToRow(fullTask), taskToRow(minimalTask)],
    })
    const adapter = new SupabaseAdapter(() => client)
    const data = await adapter.load()
    expect(data.schemaVersion).toBe(SCHEMA_VERSION)
    expect(data.meals).toEqual([fullMeal])
    expect(data.tasks).toEqual([fullTask, minimalTask])
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual(['meals:select', 'tasks:select'])
  })

  it('saveMeal / saveTask upsert the mapped row (no user_id — DB default fills it)', async () => {
    const { client, calls } = makeMockClient()
    const adapter = new SupabaseAdapter(() => client)
    await adapter.saveMeal(fullMeal)
    await adapter.saveTask(minimalTask)
    expect(calls[0]).toEqual({ table: 'meals', op: 'upsert', args: mealToRow(fullMeal) })
    expect(calls[1]).toEqual({ table: 'tasks', op: 'upsert', args: taskToRow(minimalTask) })
    expect('user_id' in (calls[0].args as Record<string, unknown>)).toBe(false)
  })

  it('deleteMeal / deleteTask filter by id', async () => {
    const { client, calls } = makeMockClient()
    const adapter = new SupabaseAdapter(() => client)
    await adapter.deleteMeal('m-x')
    await adapter.deleteTask('t-x')
    expect(calls).toEqual([
      { table: 'meals', op: 'delete', args: ['id', 'm-x'] },
      { table: 'tasks', op: 'delete', args: ['id', 't-x'] },
    ])
  })

  it('replaceAll calls the atomic replace_all RPC with mapped rows', async () => {
    const { client, calls } = makeMockClient()
    const adapter = new SupabaseAdapter(() => client)
    await adapter.replaceAll({
      schemaVersion: SCHEMA_VERSION,
      meals: [minimalMeal],
      tasks: [fullTask],
    })
    expect(calls).toEqual([
      {
        op: 'rpc:replace_all',
        args: { p_meals: [mealToRow(minimalMeal)], p_tasks: [taskToRow(fullTask)] },
      },
    ])
  })

  it('throws instead of silently returning empty data when the backend errors', async () => {
    const { client } = makeMockClient({}, true)
    const adapter = new SupabaseAdapter(() => client)
    await expect(adapter.load()).rejects.toBeTruthy()
    await expect(adapter.saveMeal(fullMeal)).rejects.toBeTruthy()
    await expect(
      adapter.replaceAll({ schemaVersion: 1, meals: [], tasks: [] }),
    ).rejects.toBeTruthy()
  })
})
