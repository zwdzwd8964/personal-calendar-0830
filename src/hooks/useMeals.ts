import { create } from 'zustand'
import type { ISODate, MealSlot } from '@/types'
import { storage } from '@/storage'
import { newId } from '@/lib/id'

export interface MealUpsertInput {
  id?: string
  date: ISODate
  slot: 'lunch' | 'dinner'
  person: string
  place?: string
  note?: string
}

export interface MealsState {
  meals: MealSlot[]
  loaded: boolean
  init(): Promise<void>
  upsert(input: MealUpsertInput): Promise<void>
  remove(id: string): Promise<void>
}

/** 查找某天某槽的饭局；(date, slot) 唯一，最多一条。 */
export function mealFor(
  meals: MealSlot[],
  date: ISODate,
  slot: 'lunch' | 'dinner',
): MealSlot | undefined {
  return meals.find((m) => m.date === date && m.slot === slot)
}

let initPromise: Promise<void> | null = null

export const useMeals = create<MealsState>()((set, get) => ({
  meals: [],
  loaded: false,

  async init() {
    if (get().loaded) return
    initPromise ??= storage
      .load()
      .then((data) => {
        set({ meals: data.meals, loaded: true })
      })
      .finally(() => {
        initPromise = null
      })
    await initPromise
  },

  async upsert(input) {
    const now = new Date().toISOString()
    const meals = get().meals
    const byId = input.id ? meals.find((m) => m.id === input.id) : undefined

    if (byId) {
      // 按 id 更新；若改动 (date, slot) 后与另一条冲突，删除被顶掉的那条以保持一槽一条
      const updated: MealSlot = {
        ...byId,
        date: input.date,
        slot: input.slot,
        person: input.person,
        place: input.place,
        note: input.note,
        updatedAt: now,
      }
      const displaced = meals.find(
        (m) => m.id !== updated.id && m.date === updated.date && m.slot === updated.slot,
      )
      // 先持久化后入内存（先删被挤占者以兼容 (user_id,date,slot) 唯一索引）
      if (displaced) await storage.deleteMeal(displaced.id)
      await storage.saveMeal(updated)
      set({
        meals: get()
          .meals.filter((m) => !(displaced && m.id === displaced.id))
          .map((m) => (m.id === updated.id ? updated : m)),
      })
      return
    }

    const occupant = mealFor(meals, input.date, input.slot)
    if (occupant) {
      // (date, slot) 已被占用：覆写该条内容，保留其 id / createdAt
      const updated: MealSlot = {
        ...occupant,
        person: input.person,
        place: input.place,
        note: input.note,
        updatedAt: now,
      }
      await storage.saveMeal(updated)
      set({ meals: get().meals.map((m) => (m.id === occupant.id ? updated : m)) })
      return
    }

    const created: MealSlot = {
      id: newId(),
      date: input.date,
      slot: input.slot,
      person: input.person,
      place: input.place,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    }
    await storage.saveMeal(created)
    set({ meals: [...get().meals, created] })
  },

  async remove(id) {
    const meals = get().meals
    if (!meals.some((m) => m.id === id)) return
    set({ meals: meals.filter((m) => m.id !== id) })
    await storage.deleteMeal(id)
  },
}))
