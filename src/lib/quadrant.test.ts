import type { Task } from '@/types'
import {
  QUADRANT_ORDER,
  SORT_GAP,
  groupFuzzy,
  nextSortOrder,
  quadrantOf,
  reorderPatches,
} from '@/lib/quadrant'

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    mode: 'fuzzy',
    status: 'todo',
    important: false,
    urgent: false,
    tags: [],
    checklist: [],
    sortOrder: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('quadrantOf', () => {
  it('maps important+urgent to Q1', () => {
    expect(quadrantOf({ important: true, urgent: true })).toBe('Q1')
  })

  it('maps important, not urgent to Q2', () => {
    expect(quadrantOf({ important: true, urgent: false })).toBe('Q2')
  })

  it('maps urgent, not important to Q3', () => {
    expect(quadrantOf({ important: false, urgent: true })).toBe('Q3')
  })

  it('maps neither to Q4', () => {
    expect(quadrantOf({ important: false, urgent: false })).toBe('Q4')
  })
})

describe('QUADRANT_ORDER / SORT_GAP', () => {
  it('orders quadrants Q1 → Q4', () => {
    expect(QUADRANT_ORDER).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
  })

  it('uses a gap of 1000', () => {
    expect(SORT_GAP).toBe(1000)
  })
})

describe('groupFuzzy', () => {
  it('always returns all four keys, empty arrays included', () => {
    const groups = groupFuzzy([])
    expect(Object.keys(groups).sort()).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
    for (const q of QUADRANT_ORDER) expect(groups[q]).toEqual([])
  })

  it('groups tasks into their quadrants', () => {
    const q1 = makeTask({ id: 'q1', important: true, urgent: true })
    const q2 = makeTask({ id: 'q2', important: true, urgent: false })
    const q3 = makeTask({ id: 'q3', important: false, urgent: true })
    const q4 = makeTask({ id: 'q4', important: false, urgent: false })
    const groups = groupFuzzy([q4, q3, q2, q1])
    expect(groups.Q1.map((t) => t.id)).toEqual(['q1'])
    expect(groups.Q2.map((t) => t.id)).toEqual(['q2'])
    expect(groups.Q3.map((t) => t.id)).toEqual(['q3'])
    expect(groups.Q4.map((t) => t.id)).toEqual(['q4'])
  })

  it('sorts each group by sortOrder ascending', () => {
    const a = makeTask({ id: 'a', important: true, urgent: true, sortOrder: 3000 })
    const b = makeTask({ id: 'b', important: true, urgent: true, sortOrder: 1000 })
    const c = makeTask({ id: 'c', important: true, urgent: true, sortOrder: 2000 })
    const groups = groupFuzzy([a, b, c])
    expect(groups.Q1.map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })

  it('breaks sortOrder ties by createdAt then id', () => {
    const later = makeTask({
      id: 'a-later',
      sortOrder: 1000,
      createdAt: '2026-08-02T00:00:00.000Z',
    })
    const early = makeTask({
      id: 'z-early',
      sortOrder: 1000,
      createdAt: '2026-08-01T00:00:00.000Z',
    })
    const twinA = makeTask({ id: 'twin-a', sortOrder: 1000, createdAt: '2026-08-02T00:00:00.000Z' })
    const groups = groupFuzzy([later, twinA, early])
    expect(groups.Q4.map((t) => t.id)).toEqual(['z-early', 'a-later', 'twin-a'])
  })
})

describe('nextSortOrder', () => {
  it('returns SORT_GAP for an empty list', () => {
    expect(nextSortOrder([])).toBe(1000)
  })

  it('returns max sortOrder + SORT_GAP', () => {
    const tasks = [makeTask({ id: 'a', sortOrder: 3000 }), makeTask({ id: 'b', sortOrder: 1000 })]
    expect(nextSortOrder(tasks)).toBe(4000)
  })
})

describe('reorderPatches', () => {
  const three = () => [
    makeTask({ id: 'a', sortOrder: 1000 }),
    makeTask({ id: 'b', sortOrder: 2000 }),
    makeTask({ id: 'c', sortOrder: 3000 }),
  ]

  it('returns [] when activeId === overId', () => {
    expect(reorderPatches(three(), 'b', 'b')).toEqual([])
  })

  it('returns [] for unknown ids', () => {
    expect(reorderPatches(three(), 'nope', 'a')).toEqual([])
    expect(reorderPatches(three(), 'a', 'nope')).toEqual([])
  })

  it('moves to top: first − SORT_GAP', () => {
    expect(reorderPatches(three(), 'c', 'a')).toEqual([{ id: 'c', sortOrder: 0 }])
  })

  it('moves to bottom: last + SORT_GAP', () => {
    expect(reorderPatches(three(), 'a', 'c')).toEqual([{ id: 'a', sortOrder: 4000 }])
  })

  it('moves to middle: integer midpoint of new neighbors', () => {
    const four = [
      makeTask({ id: 'a', sortOrder: 1000 }),
      makeTask({ id: 'b', sortOrder: 2000 }),
      makeTask({ id: 'c', sortOrder: 3000 }),
      makeTask({ id: 'd', sortOrder: 4000 }),
    ]
    // arrayMove: d lands at index 1, between a(1000) and b(2000)
    expect(reorderPatches(four, 'd', 'b')).toEqual([{ id: 'd', sortOrder: 1500 }])
    // a lands at index 2, between c(3000) and d(4000)
    expect(reorderPatches(four, 'a', 'c')).toEqual([{ id: 'a', sortOrder: 3500 }])
  })

  it('uses the smallest usable gap (neighbors 2 apart)', () => {
    const tight = [
      makeTask({ id: 'a', sortOrder: 1000 }),
      makeTask({ id: 'b', sortOrder: 1002 }),
      makeTask({ id: 'c', sortOrder: 9000 }),
    ]
    // c lands between a(1000) and b(1002) → midpoint 1001
    expect(reorderPatches(tight, 'c', 'b')).toEqual([{ id: 'c', sortOrder: 1001 }])
  })

  it('renumbers the whole group when neighbors are adjacent, patching only changed tasks', () => {
    const tight = [
      makeTask({ id: 'a', sortOrder: 1000 }),
      makeTask({ id: 'b', sortOrder: 1001 }),
      makeTask({ id: 'c', sortOrder: 3000 }),
    ]
    // c lands between a(1000) and b(1001): no integer fits → renumber to 1000/2000/3000.
    // New order is [a, c, b]; a keeps 1000 so it gets no patch.
    expect(reorderPatches(tight, 'c', 'b')).toEqual([
      { id: 'c', sortOrder: 2000 },
      { id: 'b', sortOrder: 3000 },
    ])
  })

  it('does not mutate the input array', () => {
    const tasks = three()
    reorderPatches(tasks, 'c', 'a')
    expect(tasks.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(tasks.map((t) => t.sortOrder)).toEqual([1000, 2000, 3000])
  })
})
