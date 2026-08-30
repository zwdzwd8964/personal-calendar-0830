import type { MealSlot, Task } from '@/types'

/** UTF-8 BOM，Excel 识别中文所需（§8.5）。两个导出函数返回的内容均已带 BOM。 */
export const CSV_BOM = '\uFEFF'

type CellValue = string | number | boolean | undefined

/** RFC4180：含逗号 / 引号 / 换行的单元格用双引号包裹，内部引号翻倍。 */
function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCell(value: CellValue): string {
  if (value === undefined) return ''
  return escapeCell(String(value))
}

function buildCsv(header: readonly string[], rows: CellValue[][]): string {
  const lines = [header.map(toCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(toCell).join(','))
  }
  return CSV_BOM + lines.join('\r\n')
}

const MEAL_HEADER = ['id', 'date', 'slot', 'person', 'place', 'note', 'createdAt', 'updatedAt']

export function mealsToCsv(meals: MealSlot[]): string {
  return buildCsv(
    MEAL_HEADER,
    meals.map((m) => [m.id, m.date, m.slot, m.person, m.place, m.note, m.createdAt, m.updatedAt]),
  )
}

const TASK_HEADER = [
  'id',
  'title',
  'mode',
  'status',
  'important',
  'urgent',
  'size',
  'deadline',
  'estimateDays',
  'tags',
  'checklist',
  'sortOrder',
  'note',
  'doneAt',
  'createdAt',
  'updatedAt',
]

export function tasksToCsv(tasks: Task[]): string {
  return buildCsv(
    TASK_HEADER,
    tasks.map((t) => [
      t.id,
      t.title,
      t.mode,
      t.status,
      t.important,
      t.urgent,
      t.size,
      t.deadline,
      t.estimateDays,
      // checklist / tags 序列化为 JSON 字符串单列（§8.5）
      JSON.stringify(t.tags),
      JSON.stringify(t.checklist),
      t.sortOrder,
      t.note,
      t.doneAt,
      t.createdAt,
      t.updatedAt,
    ]),
  )
}
