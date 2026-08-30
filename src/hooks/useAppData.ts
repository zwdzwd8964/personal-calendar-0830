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

async function importData(data: AppData): Promise<void> {
  // §6 禁止 adapter 做校验，hooks 是唯一能拦下坏数据的层
  if (!Array.isArray(data.meals) || !Array.isArray(data.tasks)) {
    throw new Error('invalid import data: meals/tasks must be arrays')
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
