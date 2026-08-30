export const SCHEMA_VERSION = 1

export type ISODate = string // 'YYYY-MM-DD'

// 轨道一：饭局。(date, slot) 唯一，一槽一条；多人写进 person，细节写 note。
export interface MealSlot {
  id: string
  date: ISODate
  slot: 'lunch' | 'dinner'
  person: string
  place?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export type TaskMode = 'fuzzy' | 'firm'
export type TaskStatus = 'todo' | 'doing' | 'done' | 'shelved'
export type TaskSize = 'S' | 'M' | 'L' | 'XL'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  mode: TaskMode
  status: TaskStatus
  important: boolean // 四象限 = important × urgent
  urgent: boolean
  size?: TaskSize // 模糊档的规模感
  deadline?: ISODate // firm 档必填（由表单与 hooks 校验）
  estimateDays?: number // 预计耗时（天，支持 0.5），firm 档使用
  tags: string[]
  checklist: ChecklistItem[]
  sortOrder: number // 同象限内手动顺序
  note?: string
  doneAt?: string // ISO datetime；status='done' 时写入
  createdAt: string
  updatedAt: string
}

export interface AppData {
  schemaVersion: number
  meals: MealSlot[]
  tasks: Task[]
}
