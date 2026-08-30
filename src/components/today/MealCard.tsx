import { Link } from 'react-router-dom'
import type { ISODate, MealSlot } from '@/types'
import { useT } from '@/i18n'

interface MealCardProps {
  date: ISODate
  slot: 'lunch' | 'dinner'
  meal?: MealSlot
}

// §8.1 lunch/dinner card: filled shows person (+ place / note); empty shows only a faint plus.
// Both states link the whole card to /meals?edit=<date>:<slot> (cross-page contract).
export default function MealCard({ date, slot, meal }: MealCardProps) {
  const t = useT()
  const label = t(slot === 'lunch' ? 'today.lunch' : 'today.dinner')
  return (
    <Link
      to={`/meals?edit=${date}:${slot}`}
      aria-label={meal ? undefined : `${label} · ${t('today.emptySlot')}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300"
    >
      <div className="text-xs font-medium tracking-wide text-gray-400">{label}</div>
      {meal ? (
        <div className="mt-2 min-h-16">
          <div className="truncate text-lg font-semibold text-gray-900">{meal.person}</div>
          {meal.place && <div className="mt-0.5 truncate text-sm text-gray-500">{meal.place}</div>}
          {meal.note && <div className="mt-1 line-clamp-2 text-xs text-gray-400">{meal.note}</div>}
        </div>
      ) : (
        <div className="mt-2 flex min-h-16 items-center justify-center">
          <span aria-hidden="true" className="text-2xl font-light text-gray-300">
            ＋
          </span>
        </div>
      )}
    </Link>
  )
}
