import type { Task } from '@/types'
import { formatMonthDay, useLocale, useT } from '@/i18n'
import { daysUntil, latestStartDate, todayISO } from '@/lib/dates'
import CountdownBadge from '@/components/common/CountdownBadge'

const STATUS_DOT: Record<Task['status'], string> = {
  todo: 'bg-gray-300',
  doing: 'bg-blue-500',
  done: 'bg-green-500',
  shelved: 'bg-zinc-400',
}

interface TaskCardProps {
  task: Task
  onClick: () => void
}

// §8.3 task card: status dot + title + badges; firm cards add countdown /
// latest-start / estimate — all derived at render time (§0.5), never stored
export default function TaskCard({ task, onClick }: TaskCardProps) {
  const t = useT()
  const { locale } = useLocale()
  const done = task.status === 'done'
  const checkedCount = task.checklist.filter((item) => item.done).length
  const latestStart =
    task.mode === 'firm' && task.deadline ? latestStartDate(task.deadline, task.estimateDays) : null
  const shouldStart =
    latestStart !== null && task.status === 'todo' && daysUntil(latestStart, todayISO()) < 0

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-gray-300 ${
        done ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[task.status]}`}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm font-medium ${
                done ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}
            >
              {task.title}
            </span>
            {task.mode === 'fuzzy' && task.size && (
              <span className="shrink-0 rounded bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-600">
                {task.size}
              </span>
            )}
          </div>
          {task.mode === 'firm' && task.deadline && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CountdownBadge deadline={task.deadline} />
              {latestStart !== null && (
                <span className="text-xs text-gray-500">
                  {t('latestStart.label', { date: formatMonthDay(latestStart, locale) })}
                </span>
              )}
              {shouldStart && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {t('latestStart.shouldStart')}
                </span>
              )}
              {task.estimateDays !== undefined && (
                <span className="text-xs text-gray-400">
                  {t('tasks.estimateDays', { n: task.estimateDays })}
                </span>
              )}
            </div>
          )}
          {(task.tags.length > 0 || task.checklist.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                >
                  #{tag}
                </span>
              ))}
              {task.checklist.length > 0 && (
                <span className="text-xs text-gray-400">
                  {t('tasks.checklistProgress', {
                    done: checkedCount,
                    total: task.checklist.length,
                  })}
                </span>
              )}
            </div>
          )}
          {task.note && <p className="truncate text-xs text-gray-400">{task.note}</p>}
        </div>
      </div>
    </button>
  )
}
