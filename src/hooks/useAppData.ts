import { SCHEMA_VERSION } from '@/types'
import type { AppData } from '@/types'
import { storage } from '@/storage'
import { todayISO } from '@/lib/dates'
import { buildSeed } from '@/lib/seed'
import { useMeals } from '@/hooks/useMeals'
import { useTasks } from '@/hooks/useTasks'

export interface AppDataApi {
  ready: boolean
  isEmpty: boolean
  exportData(): AppData
  importData(data: AppData): Promise<void>
  clearAll(): Promise<void>
  loadSeedData(): Promise<void>
}

function exportData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    meals: useMeals.getState().meals,
    tasks: useTasks.getState().tasks,
  }
}

async function applyAll(data: AppData): Promise<void> {
  await storage.replaceAll(data)
  useMeals.setState({ meals: data.meals, loaded: true })
  useTasks.setState({ tasks: data.tasks, loaded: true })
}

const MEAL_SLOTS = ['lunch', 'dinner']
const TASK_MODES = ['fuzzy', 'firm']
const TASK_STATUSES = ['todo', 'doing', 'done', 'shelved']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isValidMeal(v: unknown): boolean {
  if (!isRecord(v)) return false
  return (
    typeof v.id === 'string' &&
    typeof v.date === 'string' &&
    typeof v.slot === 'string' &&
    MEAL_SLOTS.includes(v.slot) &&
    typeof v.person === 'string'
  )
}

function isValidTask(v: unknown): boolean {
  if (!isRecord(v)) return false
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.mode === 'string' &&
    TASK_MODES.includes(v.mode) &&
    typeof v.status === 'string' &&
    TASK_STATUSES.includes(v.status) &&
    typeof v.important === 'boolean' &&
    typeof v.urgent === 'boolean' &&
    typeof v.sortOrder === 'number' &&
    Array.isArray(v.tags) &&
    Array.isArray(v.checklist)
  )
}

// §6 禁止 adapter 做校验，hooks 是唯一能拦下坏数据的层。
// 元素级校验：一条坏记录（如 null）经 replaceAll 覆盖后会白屏且丢失原数据，必须整体拒绝。
export function isValidImport(data: unknown): data is Pick<AppData, 'meals' | 'tasks'> {
  if (!isRecord(data)) return false
  if (typeof data.schemaVersion === 'number' && data.schemaVersion > SCHEMA_VERSION) return false
  return (
    Array.isArray(data.meals) &&
    Array.isArray(data.tasks) &&
    data.meals.every(isValidMeal) &&
    data.tasks.every(isValidTask)
  )
}

async function importData(data: AppData): Promise<void> {
  if (!isValidImport(data)) {
    throw new Error('invalid import data')
  }
  await applyAll({ schemaVersion: SCHEMA_VERSION, meals: data.meals, tasks: data.tasks })
}

async function clearAll(): Promise<void> {
  await applyAll({ schemaVersion: SCHEMA_VERSION, meals: [], tasks: [] })
}

async function loadSeedData(): Promise<void> {
  // 先确保两个 store 都完成 init，防止在持久化数据尚未载入时误判为空并覆盖
  await Promise.all([useMeals.getState().init(), useTasks.getState().init()])
  const empty = useMeals.getState().meals.length === 0 && useTasks.getState().tasks.length === 0
  if (!empty) return
  await applyAll(buildSeed(todayISO()))
}

/** 跨 store 操作：空态判断、导入导出、清空、示例数据。UI 只经此层触达数据。 */
export function useAppData(): AppDataApi {
  const mealCount = useMeals((s) => s.meals.length)
  const taskCount = useTasks((s) => s.tasks.length)
  const mealsLoaded = useMeals((s) => s.loaded)
  const tasksLoaded = useTasks((s) => s.loaded)
  return {
    ready: mealsLoaded && tasksLoaded,
    isEmpty: mealCount === 0 && taskCount === 0,
    exportData,
    importData,
    clearAll,
    loadSeedData,
  }
}
