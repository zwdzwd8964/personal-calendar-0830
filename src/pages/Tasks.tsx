import { useMemo, useState } from 'react'
import type { Task, TaskMode } from '@/types'
import { useT } from '@/i18n'
import { todayISO } from '@/lib/dates'
import { useTasks } from '@/hooks/useTasks'
import TagFilter from '@/components/tasks/TagFilter'
import FuzzyBoard from '@/components/tasks/FuzzyBoard'
import FirmList from '@/components/tasks/FirmList'
import TaskCard from '@/components/tasks/TaskCard'
import ShelvedSection from '@/components/tasks/ShelvedSection'
import TaskFormDrawer from '@/components/tasks/TaskFormDrawer'

const COLUMNS: TaskMode[] = ['fuzzy', 'firm']

// §8.3 tasks page: mobile fuzzy|firm toggle, md+ both columns side by side;
// shared tag filter (OR logic) applies to everything in both columns
export default function Tasks() {
  const t = useT()
  const tasks = useTasks((s) => s.tasks)
  const [view, setView] = useState<TaskMode>('fuzzy')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const allTags = useMemo(
    () => Array.from(new Set(tasks.flatMap((task) => task.tags))).sort(),
    [tasks],
  )
  // drop selections whose tag no longer exists anywhere, so a stale filter can't hide everything
  const activeSelected = useMemo(
    () => selectedTags.filter((tag) => allTags.includes(tag)),
    [selectedTags, allTags],
  )
  const filtered = useMemo(
    () =>
      activeSelected.length === 0
        ? tasks
        : tasks.filter((task) => task.tags.some((tag) => activeSelected.includes(tag))),
    [tasks, activeSelected],
  )

  const today = todayISO()
  const editingTask =
    editingId !== null ? (tasks.find((task) => task.id === editingId) ?? null) : null

  const openTask = (task: Task) => {
    setEditingId(task.id)
    setDrawerOpen(true)
  }
  const openCreate = () => {
    setEditingId(null)
    setDrawerOpen(true)
  }
  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 md:hidden">
        {COLUMNS.map((mode) => (
          <button
            key={mode}
            aria-pressed={view === mode}
            onClick={() => setView(mode)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              view === mode
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(mode === 'fuzzy' ? 'tasks.fuzzy' : 'tasks.firm')}
          </button>
        ))}
      </div>

      <TagFilter tags={allTags} selected={activeSelected} onToggle={toggleTag} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {COLUMNS.map((mode) => (
          <TaskColumn
            key={mode}
            mode={mode}
            hiddenOnMobile={view !== mode}
            tasks={filtered}
            today={today}
            onOpen={openTask}
            filterActive={activeSelected.length > 0}
          />
        ))}
      </div>

      <button
        aria-label={t('tasks.new')}
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-2xl leading-none text-white shadow-lg transition-colors hover:bg-blue-700"
      >
        ＋
      </button>

      {drawerOpen && (
        <TaskFormDrawer
          key={editingId ?? 'new'}
          task={editingTask}
          defaultMode={view}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  )
}

interface TaskColumnProps {
  mode: TaskMode
  hiddenOnMobile: boolean
  tasks: Task[]
  today: string
  onOpen: (task: Task) => void
  filterActive: boolean
}

// One column = active list (+ done-today struck at bottom, §7) + collapsed shelved section
function TaskColumn({ mode, hiddenOnMobile, tasks, today, onOpen, filterActive }: TaskColumnProps) {
  const t = useT()
  const inMode = tasks.filter((task) => task.mode === mode)
  const active = inMode.filter((task) => task.status === 'todo' || task.status === 'doing')
  const doneToday = inMode.filter(
    (task) =>
      task.status === 'done' && task.doneAt !== undefined && task.doneAt.slice(0, 10) === today,
  )
  const shelved = inMode.filter((task) => task.status === 'shelved')
  const empty = active.length === 0 && doneToday.length === 0 && shelved.length === 0

  return (
    <section className={`space-y-3 ${hiddenOnMobile ? 'hidden md:block' : ''}`}>
      <h2 className="hidden text-sm font-semibold text-gray-700 md:block">
        {t(mode === 'fuzzy' ? 'tasks.fuzzy' : 'tasks.firm')}
      </h2>
      {empty ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          {t('tasks.empty')}
        </div>
      ) : (
        <>
          {mode === 'fuzzy' ? (
            <FuzzyBoard tasks={active} onOpen={onOpen} dragDisabled={filterActive} />
          ) : (
            <FirmList tasks={active} onOpen={onOpen} />
          )}
          {doneToday.length > 0 && (
            <div className="space-y-2">
              {doneToday.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onOpen(task)} />
              ))}
            </div>
          )}
          <ShelvedSection tasks={shelved} onOpen={onOpen} />
        </>
      )}
    </section>
  )
}
