import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types'
import { QUADRANT_ORDER, groupFuzzy, reorderPatches } from '@/lib/quadrant'
import type { Quadrant } from '@/lib/quadrant'
import { useT } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { useTasks } from '@/hooks/useTasks'
import TaskCard from './TaskCard'

// §8.3 quadrant colors: Q1 red / Q2 blue / Q3 amber / Q4 gray
const QUADRANT_META: Record<
  Quadrant,
  { labelKey: MessageKey; text: string; border: string; dot: string }
> = {
  Q1: { labelKey: 'tasks.q1', text: 'text-red-600', border: 'border-red-300', dot: 'bg-red-500' },
  Q2: {
    labelKey: 'tasks.q2',
    text: 'text-blue-600',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  Q3: {
    labelKey: 'tasks.q3',
    text: 'text-amber-600',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  Q4: {
    labelKey: 'tasks.q4',
    text: 'text-gray-500',
    border: 'border-gray-300',
    dot: 'bg-gray-400',
  },
}

interface FuzzyBoardProps {
  tasks: Task[] // active (todo/doing) fuzzy tasks, already tag-filtered
  onOpen: (task: Task) => void
  // dragging a filtered subset could renumber into hidden tasks' sortOrders, so it is disabled
  dragDisabled?: boolean
}

// §8.3 fuzzy column: Q1-Q4 groups, dnd reorder within a group persisted via sortOrder
export default function FuzzyBoard({ tasks, onOpen, dragDisabled = false }: FuzzyBoardProps) {
  const groups = groupFuzzy(tasks)
  return (
    <div className="space-y-4">
      {QUADRANT_ORDER.filter((q) => groups[q].length > 0).map((q) => (
        <QuadrantGroup
          key={q}
          quadrant={q}
          tasks={groups[q]}
          onOpen={onOpen}
          dragDisabled={dragDisabled}
        />
      ))}
    </div>
  )
}

interface QuadrantGroupProps {
  quadrant: Quadrant
  tasks: Task[]
  onOpen: (task: Task) => void
  dragDisabled: boolean
}

// One DndContext per quadrant keeps drags strictly inside the group
function QuadrantGroup({ quadrant, tasks, onOpen, dragDisabled }: QuadrantGroupProps) {
  const t = useT()
  const applySortOrders = useTasks((s) => s.applySortOrders)
  // distance constraint so taps still click and vertical scroll stays usable on touch
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const meta = QUADRANT_META[quadrant]

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const patches = reorderPatches(tasks, String(active.id), String(over.id))
    if (patches.length > 0) void applySortOrders(patches)
  }

  return (
    <section className={`border-l-2 pl-3 ${meta.border}`}>
      <h3 className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${meta.text}`}>
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {t(meta.labelKey)}
        <span className="font-normal text-gray-400">{tasks.length}</span>
      </h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <SortableTask key={task.id} task={task} onOpen={onOpen} disabled={dragDisabled} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  )
}

function SortableTask({
  task,
  onOpen,
  disabled,
}: {
  task: Task
  onOpen: (task: Task) => void
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'manipulation',
      }}
      className={isDragging ? 'relative z-10 opacity-75' : ''}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={() => onOpen(task)} />
    </div>
  )
}
