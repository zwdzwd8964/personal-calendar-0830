import { Link } from 'react-router-dom'
import type { Task } from '@/types'
import { useT } from '@/i18n'
import CountdownBadge from '@/components/common/CountdownBadge'

// §8.1 recent deadlines: rows navigate to /tasks; caller supplies the sorted top-3 firm tasks
export default function DeadlineList({ tasks }: { tasks: Task[] }) {
  const t = useT()
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-gray-500">{t('today.recentDeadlines')}</h2>
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-center text-sm text-gray-400">
          {t('today.noDeadlines')}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to="/tasks"
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <span className="truncate text-sm font-medium text-gray-900">{task.title}</span>
              {task.deadline && <CountdownBadge deadline={task.deadline} />}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
