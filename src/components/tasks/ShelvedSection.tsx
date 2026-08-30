import { useState } from 'react'
import type { Task } from '@/types'
import { useT } from '@/i18n'
import { useTasks } from '@/hooks/useTasks'

interface ShelvedSectionProps {
  tasks: Task[]
  onOpen: (task: Task) => void
}

// §7 shelved: collapsed by default at the column bottom; expand to restore items to todo
export default function ShelvedSection({ tasks, onOpen }: ShelvedSectionProps) {
  const t = useT()
  const setStatus = useTasks((s) => s.setStatus)
  const [expanded, setExpanded] = useState(false)
  if (tasks.length === 0) return null
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
      >
        <span>{t('tasks.shelvedFold', { n: tasks.length })}</span>
        <span aria-hidden>{expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && (
        <ul className="divide-y divide-gray-100 border-t border-gray-200 bg-white">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2 px-3 py-2">
              <button
                onClick={() => onOpen(task)}
                className="min-w-0 flex-1 truncate text-left text-sm text-gray-500 hover:text-gray-700"
              >
                {task.title}
              </button>
              <button
                onClick={() => void setStatus(task.id, 'todo')}
                className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {t('tasks.action.restore')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
