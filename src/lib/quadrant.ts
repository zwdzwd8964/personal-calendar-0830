import type { Task } from '@/types'

export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4'

/** Q1 → Q4 display order. */
export const QUADRANT_ORDER: readonly Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'] as const

/** Gap between consecutive sortOrder values; leaves room for midpoint insertion. */
export const SORT_GAP = 1000

/** Q1 important+urgent · Q2 important only · Q3 urgent only · Q4 neither. */
export function quadrantOf(t: Pick<Task, 'important' | 'urgent'>): Quadrant {
  if (t.important && t.urgent) return 'Q1'
  if (t.important) return 'Q2'
  if (t.urgent) return 'Q3'
  return 'Q4'
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** sortOrder ascending, stable tie-break by createdAt then id. */
function compareTasks(a: Task, b: Task): number {
  return (
    a.sortOrder - b.sortOrder ||
    compareStrings(a.createdAt, b.createdAt) ||
    compareStrings(a.id, b.id)
  )
}

/**
 * Group tasks Q1→Q4. Every quadrant key is always present ([] when empty);
 * each group is sorted by sortOrder ascending (ties: createdAt, then id).
 */
export function groupFuzzy(tasks: Task[]): Record<Quadrant, Task[]> {
  const groups: Record<Quadrant, Task[]> = { Q1: [], Q2: [], Q3: [], Q4: [] }
  for (const task of tasks) groups[quadrantOf(task)].push(task)
  for (const q of QUADRANT_ORDER) groups[q].sort(compareTasks)
  return groups
}

/** sortOrder for a task appended to the group: max + SORT_GAP, or SORT_GAP when empty. */
export function nextSortOrder(tasks: Task[]): number {
  if (tasks.length === 0) return SORT_GAP
  return Math.max(...tasks.map((t) => t.sortOrder)) + SORT_GAP
}

/**
 * Patches for a dnd drop within one quadrant.
 *
 * `orderedTasks` is the quadrant's list already sorted ascending. Semantics match
 * dnd-kit's arrayMove: remove the active task, insert it at the over task's index.
 * The active task gets the integer midpoint of its new neighbors (ends: first − SORT_GAP /
 * last + SORT_GAP). When no integer fits strictly between the neighbors, the whole group
 * is renumbered to SORT_GAP, 2·SORT_GAP, … and every changed task gets a patch.
 * activeId === overId or unknown ids → [].
 */
export function reorderPatches(
  orderedTasks: Task[],
  activeId: string,
  overId: string,
): { id: string; sortOrder: number }[] {
  if (activeId === overId) return []
  const oldIndex = orderedTasks.findIndex((t) => t.id === activeId)
  const newIndex = orderedTasks.findIndex((t) => t.id === overId)
  if (oldIndex === -1 || newIndex === -1) return []

  const moved = [...orderedTasks]
  const active = moved.splice(oldIndex, 1)[0]
  if (!active) return []
  moved.splice(newIndex, 0, active)

  const prev = newIndex > 0 ? moved[newIndex - 1] : undefined
  const next = newIndex < moved.length - 1 ? moved[newIndex + 1] : undefined

  let sortOrder: number | null = null
  if (!prev && next) {
    sortOrder = next.sortOrder - SORT_GAP
  } else if (prev && !next) {
    sortOrder = prev.sortOrder + SORT_GAP
  } else if (prev && next) {
    const mid = Math.floor((prev.sortOrder + next.sortOrder) / 2)
    if (mid > prev.sortOrder && mid < next.sortOrder) sortOrder = mid
  }

  if (sortOrder !== null) return [{ id: active.id, sortOrder }]

  // No integer strictly between the new neighbors — renumber the whole group.
  const patches: { id: string; sortOrder: number }[] = []
  moved.forEach((t, i) => {
    const target = (i + 1) * SORT_GAP
    if (t.sortOrder !== target) patches.push({ id: t.id, sortOrder: target })
  })
  return patches
}
