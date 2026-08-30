import type { AppData, MealSlot, Task } from '@/types'

export interface StorageAdapter {
  load(): Promise<AppData>
  saveMeal(meal: MealSlot): Promise<void> // upsert
  deleteMeal(id: string): Promise<void>
  saveTask(task: Task): Promise<void> // upsert
  deleteTask(id: string): Promise<void>
  replaceAll(data: AppData): Promise<void> // 导入用
}
