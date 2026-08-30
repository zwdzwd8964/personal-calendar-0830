import { useMemo } from 'react'
import type { Task } from '@/types'
import { useTasks } from '@/hooks/useTasks'
import { formatFullDate, monthLabel, useLocale, useT } from '@/i18n'
import { localDateOf, todayISO } from '@/lib/dates'

// After filtering, doneAt is guaranteed present; the intersection type lets TS know.
type ArchivedTask = Task & { doneAt: string }

interface MonthGroup {
  month: string // 'YYYY-MM'
  tasks: ArchivedTask[]
}

export default function Archive() {
  const t = useT()
  const { locale } = useLocale()
  const tasks = useTasks((s) => s.tasks)
  const loaded = useTasks((s) => s.loaded)
  const setStatus = useTasks((s) => s.setStatus)
  const today = todayISO()

  const groups = useMemo<MonthGroup[]>(() => {
    // Archived = done with a doneAt date other than today; today's completions stay on /tasks.
    const archived = tasks.filter(
      (task): task is ArchivedTask =>
        task.status === 'done' &&
        typeof task.doneAt === 'string' &&
        localDateOf(task.doneAt) !== today,
    )
    const byMonth = new Map<string, ArchivedTask[]>()
    for (const task of archived) {
      const month = localDateOf(task.doneAt).slice(0, 7)
      const list = byMonth.get(month)
      if (list) list.push(task)
      else byMonth.set(month, [task])
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([month, list]) => ({
        month,
        tasks: list.sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1)),
      }))
  }, [tasks, today])

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t('archive.title')}</h1>

      {groups.length === 0 ? (
        loaded && <p className="py-16 text-center text-sm text-gray-400">{t('archive.empty')}</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.month}>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                {monthLabel(group.month, locale)}
              </h2>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {group.tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-800">{task.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                        <span>{formatFullDate(localDateOf(task.doneAt), locale)}</span>
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => void setStatus(task.id, 'todo')}
                      className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      {t('archive.restore')}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
