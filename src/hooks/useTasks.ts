import { create } from 'zustand'
import type { ChecklistItem, ISODate, Task, TaskMode, TaskSize, TaskStatus } from '@/types'
import { storage } from '@/storage'
import { newId } from '@/lib/id'
import { nextSortOrder, quadrantOf } from '@/lib/quadrant'

export interface TaskCreateInput {
  title: string
  mode: TaskMode
  important: boolean
  urgent: boolean
  size?: TaskSize
  deadline?: ISODate
  estimateDays?: number
  tags?: string[]
  checklist?: ChecklistItem[]
  note?: string
}

export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt'>>

export interface TasksState {
  tasks: Task[]
  loaded: boolean
  init(): Promise<void>
  create(input: TaskCreateInput): Promise<Task>
  update(id: string, patch: TaskPatch): Promise<void>
  remove(id: string): Promise<void>
  setStatus(id: string, status: TaskStatus): Promise<void>
  promote(id: string): Promise<boolean>
  demote(id: string): Promise<void>
  applySortOrders(patches: { id: string; sortOrder: number }[]): Promise<void>
}

let initPromise: Promise<void> | null = null

export const useTasks = create<TasksState>()((set, get) => ({
  tasks: [],
  loaded: false,

  async init() {
    if (get().loaded) return
    initPromise ??= storage
      .load()
      .then((data) => {
        set({ tasks: data.tasks, loaded: true })
      })
      .finally(() => {
        initPromise = null
      })
    await initPromise
  },

  async create(input) {
    if (input.mode === 'firm' && !input.deadline) {
      throw new Error('firm task requires a deadline')
    }
    const now = new Date().toISOString()
    const quadrant = quadrantOf(input)
    const siblings = get().tasks.filter((t) => t.mode === 'fuzzy' && quadrantOf(t) === quadrant)
    const task: Task = {
      id: newId(),
      title: input.title,
      mode: input.mode,
      status: 'todo',
      important: input.important,
      urgent: input.urgent,
      size: input.size,
      deadline: input.deadline,
      estimateDays: input.estimateDays,
      tags: input.tags ?? [],
      checklist: input.checklist ?? [],
      sortOrder: nextSortOrder(siblings),
      note: input.note,
      createdAt: now,
      updatedAt: now,
    }
    set({ tasks: [...get().tasks, task] })
    await storage.saveTask(task)
    return task
  },

  async update(id, patch) {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const updated: Task = { ...task, ...patch, updatedAt: new Date().toISOString() }
    if (updated.mode === 'firm' && !updated.deadline) {
      throw new Error('firm task requires a deadline')
    }
    // doneAt 不变量与 setStatus 保持一致：经 update 改 status 同样生效
    if (patch.status !== undefined && patch.status !== task.status) {
      if (patch.status === 'done') {
        if (!updated.doneAt) updated.doneAt = updated.updatedAt
      } else if (task.status === 'done' && patch.doneAt === undefined) {
        delete updated.doneAt
      }
    }
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) })
    await storage.saveTask(updated)
  },

  async remove(id) {
    const tasks = get().tasks
    if (!tasks.some((t) => t.id === id)) return
    set({ tasks: tasks.filter((t) => t.id !== id) })
    await storage.deleteTask(id)
  },

  async setStatus(id, status) {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const now = new Date().toISOString()
    const updated: Task = { ...task, status, updatedAt: now }
    if (status === 'done') {
      // 进入 done 写入 doneAt；重复置 done 保留原完成时间
      if (task.status !== 'done' || !updated.doneAt) updated.doneAt = now
    } else {
      delete updated.doneAt
    }
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) })
    await storage.saveTask(updated)
  },

  async promote(id) {
    const task = get().tasks.find((t) => t.id === id)
    if (!task || !task.deadline) return false
    if (task.mode === 'firm') return true
    const updated: Task = { ...task, mode: 'firm', updatedAt: new Date().toISOString() }
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) })
    await storage.saveTask(updated)
    return true
  },

  async demote(id) {
    const task = get().tasks.find((t) => t.id === id)
    if (!task || task.mode === 'fuzzy') return
    // 只翻 mode，deadline / estimateDays 保留
    const updated: Task = { ...task, mode: 'fuzzy', updatedAt: new Date().toISOString() }
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) })
    await storage.saveTask(updated)
  },

  async applySortOrders(patches) {
    if (patches.length === 0) return
    const now = new Date().toISOString()
    const orderById = new Map(patches.map((p) => [p.id, p.sortOrder]))
    const changed: Task[] = []
    const tasks = get().tasks.map((t) => {
      const sortOrder = orderById.get(t.id)
      if (sortOrder === undefined || sortOrder === t.sortOrder) return t
      const updated: Task = { ...t, sortOrder, updatedAt: now }
      changed.push(updated)
      return updated
    })
    set({ tasks })
    for (const t of changed) await storage.saveTask(t)
  },
}))
