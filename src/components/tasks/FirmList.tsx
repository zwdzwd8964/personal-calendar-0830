import { useMemo } from 'react'
import type { Task } from '@/types'
import TaskCard from './TaskCard'

interface FirmListProps {
  tasks: Task[] // active (todo/doing) firm tasks, already tag-filtered
  onOpen: (task: Task) => void
}

// §8.3 firm column: deadline ascending, sorted at render time (§0.5)
export default function FirmList({ tasks, onOpen }: FirmListProps) {
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? '')),
    [tasks],
  )
  return (
    <div className="space-y-2">
      {sorted.map((task) => (
        <TaskCard key={task.id} task={task} onClick={() => onOpen(task)} />
      ))}
    </div>
  )
}
