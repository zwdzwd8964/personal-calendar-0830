import { useMemo, useState } from 'react'
import { formatFullDate, useLocale } from '@/i18n'
import { todayISO } from '@/lib/dates'
import { mealFor, useMeals } from '@/hooks/useMeals'
import { useTasks } from '@/hooks/useTasks'
import { useAppData } from '@/hooks/useAppData'
import MealCard from '@/components/today/MealCard'
import DeadlineList from '@/components/today/DeadlineList'
import EmptyState from '@/components/today/EmptyState'

// §8.1 Today page: date header + lunch/dinner cards + recent deadlines;
// when the whole app is empty, the page is replaced by the empty-state panel
export default function Today() {
  const { locale } = useLocale()
  const meals = useMeals((s) => s.meals)
  const tasks = useTasks((s) => s.tasks)
  const { ready, isEmpty, loadSeedData } = useAppData()
  const [dismissed, setDismissed] = useState(false)

  const today = todayISO()
  const lunch = mealFor(meals, today, 'lunch')
  const dinner = mealFor(meals, today, 'dinner')

  // Derived at render time (§0.5): firm + unfinished, deadline ascending, top 3
  const upcoming = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.mode === 'firm' &&
            task.deadline !== undefined &&
            (task.status === 'todo' || task.status === 'doing'),
        )
        .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
        .slice(0, 3),
    [tasks],
  )

  // first paint decides once: avoid flashing the normal page before stores are ready
  if (!ready) return null

  if (isEmpty && !dismissed) {
    return (
      <EmptyState onLoadSeed={() => void loadSeedData()} onStartFresh={() => setDismissed(true)} />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
        {formatFullDate(today, locale)}
      </h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <MealCard date={today} slot="lunch" meal={lunch} />
        <MealCard date={today} slot="dinner" meal={dinner} />
      </div>
      <DeadlineList tasks={upcoming} />
    </div>
  )
}
