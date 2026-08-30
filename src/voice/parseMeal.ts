// TODO(P2): 语音录入解析——现在只留接口与类型，禁止实现任何解析逻辑（CLAUDE.md §10）。
// P2 时产出的草稿必须走与手动录入完全相同的 useMeals().upsert() 路径。
import type { ISODate, MealSlot } from '@/types'

export type MealDraft = Pick<MealSlot, 'date' | 'slot' | 'person'> &
  Partial<Pick<MealSlot, 'place' | 'note'>>

export async function parseMealUtterance(text: string, refDate: ISODate): Promise<MealDraft[]> {
  void text
  void refDate
  throw new Error('P2: not implemented')
}
