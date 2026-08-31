import type { SupabaseClient } from '@supabase/supabase-js'
import { SCHEMA_VERSION } from '@/types'
import type {
  AppData,
  ChecklistItem,
  MealSlot,
  Task,
  TaskMode,
  TaskSize,
  TaskStatus,
} from '@/types'
import type { StorageAdapter } from './adapter'
import { getSupabaseClient } from './supabaseClient'

// ─────────────── 行类型（snake_case，对应 supabase/migrations/0001_init.sql） ───────────────

export interface MealRow {
  id: string
  date: string
  slot: string
  person: string
  place: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface TaskRow {
  id: string
  title: string
  mode: string
  status: string
  important: boolean
  urgent: boolean
  size: string | null
  deadline: string | null
  estimate_days: number | null
  tags: string[]
  checklist: ChecklistItem[]
  sort_order: number
  note: string | null
  done_at: string | null
  created_at: string
  updated_at: string
}

// timestamptz 读回可能是 '+00:00' 形态；统一成 toISOString() 的 'Z' 形态，
// 保证 groupFuzzy 的 createdAt 字符串平序比较稳定（docs/DECISIONS.md）
function toIso(value: string): string {
  return new Date(value).toISOString()
}

// 离线快照（§6 P2）：成功 load 后镜像整包数据；网络失败时回退快照（只读语义，
// 横幅在 bootstrap 层提示「修改不会被保存」），无快照才向上抛
export const CLOUD_SNAPSHOT_KEY = 'dtm.cloud.snapshot.v1'

function readSnapshot(): AppData | null {
  try {
    const raw = localStorage.getItem(CLOUD_SNAPSHOT_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as AppData
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      parsed.schemaVersion !== SCHEMA_VERSION ||
      !Array.isArray(parsed.meals) ||
      !Array.isArray(parsed.tasks)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeSnapshot(data: AppData): void {
  try {
    localStorage.setItem(CLOUD_SNAPSHOT_KEY, JSON.stringify(data))
  } catch {
    // 配额不足等：快照是尽力而为的缓存，失败不影响主流程
  }
}

// ─────────────── 行映射（纯函数，supabase.test.ts 覆盖） ───────────────

export function mealToRow(meal: MealSlot): MealRow {
  return {
    id: meal.id,
    date: meal.date,
    slot: meal.slot,
    person: meal.person,
    place: meal.place ?? null,
    note: meal.note ?? null,
    created_at: meal.createdAt,
    updated_at: meal.updatedAt,
  }
}

export function mealFromRow(row: MealRow): MealSlot {
  return {
    id: row.id,
    date: row.date,
    slot: row.slot as MealSlot['slot'],
    person: row.person,
    ...(row.place !== null ? { place: row.place } : {}),
    ...(row.note !== null ? { note: row.note } : {}),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

export function taskToRow(task: Task): TaskRow {
  return {
    id: task.id,
    title: task.title,
    mode: task.mode,
    status: task.status,
    important: task.important,
    urgent: task.urgent,
    size: task.size ?? null,
    deadline: task.deadline ?? null,
    estimate_days: task.estimateDays ?? null,
    tags: task.tags,
    checklist: task.checklist,
    sort_order: task.sortOrder,
    note: task.note ?? null,
    done_at: task.doneAt ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }
}

export function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode as TaskMode,
    status: row.status as TaskStatus,
    important: row.important,
    urgent: row.urgent,
    ...(row.size !== null ? { size: row.size as TaskSize } : {}),
    ...(row.deadline !== null ? { deadline: row.deadline } : {}),
    ...(row.estimate_days !== null ? { estimateDays: Number(row.estimate_days) } : {}),
    tags: row.tags,
    checklist: row.checklist,
    sortOrder: row.sort_order,
    ...(row.note !== null ? { note: row.note } : {}),
    ...(row.done_at !== null ? { doneAt: toIso(row.done_at) } : {}),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

// ─────────────── Adapter ───────────────

/**
 * Supabase 实现（§6）：meals / tasks 两表，RLS 按 auth.uid() 行级隔离。
 * 只做持久化——不含业务逻辑、校验、排序；写入按操作直发（无防抖）；
 * 读写失败向上抛，绝不静默返回空数据。
 */
export class SupabaseAdapter implements StorageAdapter {
  constructor(private readonly clientFactory: () => SupabaseClient = getSupabaseClient) {}

  private get client(): SupabaseClient {
    return this.clientFactory()
  }

  async load(): Promise<AppData> {
    try {
      const [meals, tasks] = await Promise.all([
        this.client.from('meals').select('*'),
        this.client.from('tasks').select('*'),
      ])
      if (meals.error) throw meals.error
      if (tasks.error) throw tasks.error
      const data: AppData = {
        schemaVersion: SCHEMA_VERSION,
        meals: ((meals.data ?? []) as MealRow[]).map(mealFromRow),
        tasks: ((tasks.data ?? []) as TaskRow[]).map(taskFromRow),
      }
      writeSnapshot(data)
      return data
    } catch (err) {
      const snapshot = readSnapshot()
      if (snapshot !== null) return snapshot
      throw err
    }
  }

  async saveMeal(meal: MealSlot): Promise<void> {
    const { error } = await this.client.from('meals').upsert(mealToRow(meal))
    if (error) throw error
  }

  async deleteMeal(id: string): Promise<void> {
    const { error } = await this.client.from('meals').delete().eq('id', id)
    if (error) throw error
  }

  async saveTask(task: Task): Promise<void> {
    const { error } = await this.client.from('tasks').upsert(taskToRow(task))
    if (error) throw error
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await this.client.from('tasks').delete().eq('id', id)
    if (error) throw error
  }

  async replaceAll(data: AppData): Promise<void> {
    const { error } = await this.client.rpc('replace_all', {
      p_meals: data.meals.map(mealToRow),
      p_tasks: data.tasks.map(taskToRow),
    })
    if (error) throw error
  }
}
