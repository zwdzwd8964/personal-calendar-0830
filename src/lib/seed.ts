import { SCHEMA_VERSION } from '@/types'
import type { AppData, ISODate, MealSlot, Task } from '@/types'
import { addDaysISO, weekOf } from '@/lib/dates'
import { newId } from '@/lib/id'
import { SORT_GAP as GAP } from '@/lib/quadrant'

/**
 * 生成示例数据（spec §11）：
 * - 本周 4 条饭局（含今天午餐）；
 * - 8 条任务覆盖四象限、两档、各状态；1 条逾期（触发「该开始了」）、1 条含 checklist 与多标签；
 *   其中 1 条 firm 命中验收用例：deadline = 今天+5、estimateDays = 2。
 * 只经空状态 / 设置页按钮注入，绝不自动写入。
 */
export function buildSeed(today: ISODate): AppData {
  const now = new Date().toISOString()
  const week = weekOf(today)
  const todayIdx = Math.max(0, week.indexOf(today))
  // 与 todayIdx 及彼此都不同的三个下标，保证 (date, slot) 不撞
  const day = (offset: number): ISODate => week[(todayIdx + offset) % 7]

  const meal = (
    date: ISODate,
    slot: MealSlot['slot'],
    person: string,
    place?: string,
    note?: string,
  ): MealSlot => ({
    id: newId(),
    date,
    slot,
    person,
    ...(place !== undefined ? { place } : {}),
    ...(note !== undefined ? { note } : {}),
    createdAt: now,
    updatedAt: now,
  })

  const meals: MealSlot[] = [
    meal(today, 'lunch', '老张', '公司楼下湘菜馆', '聊 P1 排期'),
    meal(day(2), 'dinner', '李姐、王强', '海底捞（中关村店）'),
    meal(day(4), 'lunch', '陈老师', undefined, '请教融资节奏'),
    meal(day(5), 'dinner', '大学室友小刘'),
  ]

  const task = (partial: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task => ({
    id: newId(),
    ...partial,
    createdAt: now,
    updatedAt: now,
  })

  const tasks: Task[] = [
    // Q1 模糊 · 进行中 · checklist(3 项 1 完成) + 多标签
    task({
      title: '修复线上偶发丢单的支付回调',
      mode: 'fuzzy',
      status: 'doing',
      important: true,
      urgent: true,
      size: 'L',
      tags: ['bug', '支付', '线上'],
      checklist: [
        { id: newId(), text: '复现丢单场景', done: true },
        { id: newId(), text: '补幂等与重试日志', done: false },
        { id: newId(), text: '灰度验证 24 小时', done: false },
      ],
      sortOrder: GAP,
      note: '优先级最高，影响真实收入',
    }),
    // Q1 明确 · 逾期 2 天（最晚开始日已过 → 「该开始了」）
    task({
      title: '提交税务年报材料',
      mode: 'firm',
      status: 'todo',
      important: true,
      urgent: true,
      deadline: addDaysISO(today, -2),
      estimateDays: 3,
      tags: ['行政'],
      checklist: [],
      sortOrder: GAP * 2,
    }),
    // Q2 模糊 · 待办
    task({
      title: '调研 Supabase 迁移方案',
      mode: 'fuzzy',
      status: 'todo',
      important: true,
      urgent: false,
      size: 'M',
      tags: ['调研', 'P1'],
      checklist: [],
      sortOrder: GAP,
    }),
    // Q2 明确 · 验收用例形状：deadline = 今天+5、estimate = 2 → 最晚开始 = 今天+4
    task({
      title: '完成 MVP 验收清单自查',
      mode: 'firm',
      status: 'todo',
      important: true,
      urgent: false,
      deadline: addDaysISO(today, 5),
      estimateDays: 2,
      tags: ['开发'],
      checklist: [],
      sortOrder: GAP * 2,
    }),
    // Q3 模糊 · 待办
    task({
      title: '回复投资人跟进邮件',
      mode: 'fuzzy',
      status: 'todo',
      important: false,
      urgent: true,
      size: 'S',
      tags: ['沟通'],
      checklist: [],
      sortOrder: GAP,
    }),
    // Q3 明确 · 今天完成（doneAt = 现在 → 当天划线置底）
    task({
      title: '给合伙人发本周周报',
      mode: 'firm',
      status: 'done',
      important: false,
      urgent: true,
      deadline: today,
      estimateDays: 0.5,
      tags: ['沟通'],
      checklist: [],
      sortOrder: GAP * 2,
      doneAt: now,
    }),
    // Q4 模糊 · 搁置
    task({
      title: '整理三年旧笔记并归档',
      mode: 'fuzzy',
      status: 'shelved',
      important: false,
      urgent: false,
      size: 'XL',
      tags: ['杂务'],
      checklist: [],
      sortOrder: GAP,
    }),
    // Q4 明确 · 待办
    task({
      title: '预约公司年检',
      mode: 'firm',
      status: 'todo',
      important: false,
      urgent: false,
      deadline: addDaysISO(today, 10),
      estimateDays: 1,
      tags: [],
      checklist: [],
      sortOrder: GAP * 2,
    }),
  ]

  return { schemaVersion: SCHEMA_VERSION, meals, tasks }
}
