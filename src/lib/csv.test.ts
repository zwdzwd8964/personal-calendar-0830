import { CSV_BOM, mealsToCsv, tasksToCsv } from '@/lib/csv'
import type { ChecklistItem, MealSlot, Task } from '@/types'

/** 测试用最小 RFC4180 解析器：去 BOM、按 \r\n 分行、还原引号转义。 */
function parseCsv(content: string): string[][] {
  const body = content.startsWith(CSV_BOM) ? content.slice(1) : content
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0
  while (i < body.length) {
    const ch = body.charAt(i)
    if (inQuotes) {
      if (ch === '"') {
        if (body.charAt(i + 1) === '"') {
          cell += '"'
          i += 2
        } else {
          inQuotes = false
          i += 1
        }
      } else {
        cell += ch
        i += 1
      }
    } else if (ch === '"') {
      inQuotes = true
      i += 1
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
      i += 1
    } else if (ch === '\r' && body.charAt(i + 1) === '\n') {
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
      i += 2
    } else {
      cell += ch
      i += 1
    }
  }
  row.push(cell)
  rows.push(row)
  return rows
}

function countBom(content: string): number {
  return content.split(CSV_BOM).length - 1
}

const meal: MealSlot = {
  id: 'm-1',
  date: '2026-08-30',
  slot: 'lunch',
  person: '张三, 李四',
  place: 'Cafe "Blue"',
  note: 'line1\nline2',
  createdAt: '2026-08-30T04:00:00.000Z',
  updatedAt: '2026-08-30T05:00:00.000Z',
}

const bareMeal: MealSlot = {
  id: 'm-2',
  date: '2026-08-31',
  slot: 'dinner',
  person: '王五',
  createdAt: '2026-08-30T06:00:00.000Z',
  updatedAt: '2026-08-30T06:00:00.000Z',
}

const checklist: ChecklistItem[] = [
  { id: 'c-1', text: '写 "契约", 先', done: true },
  { id: 'c-2', text: '再写\n测试', done: false },
]

const fullTask: Task = {
  id: 't-1',
  title: 'Ship, "MVP"',
  mode: 'firm',
  status: 'doing',
  important: true,
  urgent: false,
  size: 'M',
  deadline: '2026-09-04',
  estimateDays: 0.5,
  tags: ['创业', 'dev,ops', 'quo"te'],
  checklist,
  sortOrder: 1000,
  note: 'multi\r\nline note',
  doneAt: '2026-08-30T07:00:00.000Z',
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
}

const bareTask: Task = {
  id: 't-2',
  title: 'plain',
  mode: 'fuzzy',
  status: 'todo',
  important: false,
  urgent: false,
  tags: [],
  checklist: [],
  sortOrder: 2000,
  createdAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
}

describe('mealsToCsv', () => {
  it('emits header and one row per meal, joined by CRLF', () => {
    const rows = parseCsv(mealsToCsv([meal, bareMeal]))
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual([
      'id',
      'date',
      'slot',
      'person',
      'place',
      'note',
      'createdAt',
      'updatedAt',
    ])
    expect(rows[1]).toEqual([
      'm-1',
      '2026-08-30',
      'lunch',
      '张三, 李四',
      'Cafe "Blue"',
      'line1\nline2',
      '2026-08-30T04:00:00.000Z',
      '2026-08-30T05:00:00.000Z',
    ])
  })

  it('escapes commas, quotes and newlines per RFC4180 in the raw output', () => {
    const raw = mealsToCsv([meal])
    expect(raw).toContain('"张三, 李四"')
    expect(raw).toContain('"Cafe ""Blue"""')
    expect(raw).toContain('"line1\nline2"')
  })

  it('renders optional fields as empty cells', () => {
    const rows = parseCsv(mealsToCsv([bareMeal]))
    expect(rows[1]?.[4]).toBe('')
    expect(rows[1]?.[5]).toBe('')
  })

  it('prepends the BOM exactly once, even for an empty list', () => {
    const full = mealsToCsv([meal, bareMeal])
    expect(full.startsWith(CSV_BOM)).toBe(true)
    expect(countBom(full)).toBe(1)
    const empty = mealsToCsv([])
    expect(empty.startsWith(CSV_BOM)).toBe(true)
    expect(countBom(empty)).toBe(1)
  })

  it('returns only the header row for an empty list', () => {
    expect(mealsToCsv([])).toBe(CSV_BOM + 'id,date,slot,person,place,note,createdAt,updatedAt')
  })
})

describe('tasksToCsv', () => {
  const HEADER = [
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

  it('covers every Task field in the header', () => {
    const rows = parseCsv(tasksToCsv([]))
    expect(rows[0]).toEqual(HEADER)
  })

  it('serializes scalar fields and escapes cells needing quotes', () => {
    const rows = parseCsv(tasksToCsv([fullTask]))
    const row = rows[1]
    expect(row).toHaveLength(HEADER.length)
    expect(row?.[0]).toBe('t-1')
    expect(row?.[1]).toBe('Ship, "MVP"')
    expect(row?.[4]).toBe('true')
    expect(row?.[5]).toBe('false')
    expect(row?.[8]).toBe('0.5')
    expect(row?.[11]).toBe('1000')
    expect(row?.[12]).toBe('multi\r\nline note')
  })

  it('round-trips tags and checklist through JSON.parse', () => {
    const rows = parseCsv(tasksToCsv([fullTask]))
    const row = rows[1]
    const tagsCell = row?.[HEADER.indexOf('tags')] ?? ''
    const checklistCell = row?.[HEADER.indexOf('checklist')] ?? ''
    expect(JSON.parse(tagsCell)).toEqual(['创业', 'dev,ops', 'quo"te'])
    expect(JSON.parse(checklistCell)).toEqual(checklist)
  })

  it('serializes empty tags and checklist as [] and optional fields as empty cells', () => {
    const rows = parseCsv(tasksToCsv([bareTask]))
    const row = rows[1]
    expect(JSON.parse(row?.[HEADER.indexOf('tags')] ?? '')).toEqual([])
    expect(JSON.parse(row?.[HEADER.indexOf('checklist')] ?? '')).toEqual([])
    expect(row?.[HEADER.indexOf('size')]).toBe('')
    expect(row?.[HEADER.indexOf('deadline')]).toBe('')
    expect(row?.[HEADER.indexOf('estimateDays')]).toBe('')
    expect(row?.[HEADER.indexOf('note')]).toBe('')
    expect(row?.[HEADER.indexOf('doneAt')]).toBe('')
  })

  it('prepends the BOM exactly once', () => {
    const full = tasksToCsv([fullTask, bareTask])
    expect(full.startsWith(CSV_BOM)).toBe(true)
    expect(countBom(full)).toBe(1)
  })
})
