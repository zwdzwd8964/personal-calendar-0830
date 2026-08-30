import type { AppData, MealSlot, Task } from '@/types'
import type { StorageAdapter } from './adapter'

const NOT_IMPLEMENTED = 'P1: Supabase adapter not implemented'

/**
 * P1 占位实现：同一 StorageAdapter 接口，换掉 index.ts 的实例即可切换，
 * hooks 及以上代码零改动（§2 铁律）。
 *
 * TODO(P1): meals / tasks 两表；checklist 用 JSONB、tags 用 text[]；单账号邮箱登录。
 */
export class SupabaseAdapter implements StorageAdapter {
  load(): Promise<AppData> {
    // TODO(P1): select 两表并组装 AppData
    throw new Error(NOT_IMPLEMENTED)
  }

  saveMeal(meal: MealSlot): Promise<void> {
    // TODO(P1): upsert 到 meals 表
    void meal
    throw new Error(NOT_IMPLEMENTED)
  }

  deleteMeal(id: string): Promise<void> {
    // TODO(P1): delete from meals where id = id
    void id
    throw new Error(NOT_IMPLEMENTED)
  }

  saveTask(task: Task): Promise<void> {
    // TODO(P1): upsert 到 tasks 表
    void task
    throw new Error(NOT_IMPLEMENTED)
  }

  deleteTask(id: string): Promise<void> {
    // TODO(P1): delete from tasks where id = id
    void id
    throw new Error(NOT_IMPLEMENTED)
  }

  replaceAll(data: AppData): Promise<void> {
    // TODO(P1): 事务内清空并批量写入两表
    void data
    throw new Error(NOT_IMPLEMENTED)
  }
}
