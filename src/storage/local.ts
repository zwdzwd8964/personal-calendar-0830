import { SCHEMA_VERSION } from '@/types'
import type { AppData, MealSlot, Task } from '@/types'
import type { StorageAdapter } from './adapter'

export const STORAGE_KEY = 'dtm.data.v1'

const DEBOUNCE_MS = 300

function freshData(): AppData {
  return { schemaVersion: SCHEMA_VERSION, meals: [], tasks: [] }
}

function readFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return freshData()
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as AppData).schemaVersion !== SCHEMA_VERSION ||
      !Array.isArray((parsed as AppData).meals) ||
      !Array.isArray((parsed as AppData).tasks)
    ) {
      return freshData()
    }
    return parsed as AppData
  } catch {
    return freshData()
  }
}

/**
 * localStorage 实现：整包 AppData 存单 key，写入 300ms 尾部防抖。
 * 只做持久化——不含业务逻辑、校验、排序。
 */
export class LocalStorageAdapter implements StorageAdapter {
  private data: AppData | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  private ensureLoaded(): AppData {
    if (this.data === null) {
      this.data = readFromStorage()
    }
    return this.data
  }

  private scheduleWrite(): void {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      this.writeNow()
    }, DEBOUNCE_MS)
  }

  private writeNow(): void {
    if (this.data === null) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch {
      // 持久化失败（如配额）时静默：内存副本仍是最新，下次写入会重试
    }
  }

  /** 立即落盘挂起的防抖写入（供测试 / beforeunload 使用） */
  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
      this.writeNow()
    }
  }

  load(): Promise<AppData> {
    // 边界深拷贝：调用方拿到的对象与内部缓存互不别名
    return Promise.resolve(structuredClone(this.ensureLoaded()))
  }

  saveMeal(meal: MealSlot): Promise<void> {
    const data = this.ensureLoaded()
    const idx = data.meals.findIndex((m) => m.id === meal.id)
    if (idx >= 0) data.meals[idx] = meal
    else data.meals.push(meal)
    this.scheduleWrite()
    return Promise.resolve()
  }

  deleteMeal(id: string): Promise<void> {
    const data = this.ensureLoaded()
    data.meals = data.meals.filter((m) => m.id !== id)
    this.scheduleWrite()
    return Promise.resolve()
  }

  saveTask(task: Task): Promise<void> {
    const data = this.ensureLoaded()
    const idx = data.tasks.findIndex((t) => t.id === task.id)
    if (idx >= 0) data.tasks[idx] = task
    else data.tasks.push(task)
    this.scheduleWrite()
    return Promise.resolve()
  }

  deleteTask(id: string): Promise<void> {
    const data = this.ensureLoaded()
    data.tasks = data.tasks.filter((t) => t.id !== id)
    this.scheduleWrite()
    return Promise.resolve()
  }

  replaceAll(data: AppData): Promise<void> {
    this.data = structuredClone(data)
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.writeNow() // 导入路径必须立即持久化
    return Promise.resolve()
  }
}
