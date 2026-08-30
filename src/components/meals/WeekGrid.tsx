import { Fragment } from 'react'
import type { ISODate, MealSlot } from '@/types'
import type { MessageKey } from '@/i18n'
import { formatFullDate, useLocale, useT } from '@/i18n'
import { mealFor } from '@/hooks/useMeals'

type SlotKind = MealSlot['slot']

interface WeekGridProps {
  week: ISODate[]
  today: ISODate
  meals: MealSlot[]
  onOpenSlot: (date: ISODate, slot: SlotKind) => void
}

const SLOTS: { slot: SlotKind; shortKey: MessageKey; fullKey: MessageKey }[] = [
  { slot: 'lunch', shortKey: 'meals.lunchShort', fullKey: 'meals.lunch' },
  { slot: 'dinner', shortKey: 'meals.dinnerShort', fullKey: 'meals.dinner' },
]

interface SlotCellProps {
  meal?: MealSlot
  highlight: boolean
  ariaLabel: string
  slotTag?: string
  onClick: () => void
}

// One clickable cell. Empty = blank (faint plus on hover), filled = person + place.
function SlotCell({ meal, highlight, ariaLabel, slotTag, onClick }: SlotCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group flex min-h-16 w-full flex-col items-start gap-0.5 rounded-lg border p-2 text-left transition-colors ${
        meal
          ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
          : 'border-transparent bg-gray-50 hover:bg-gray-100'
      } ${highlight ? 'ring-1 ring-blue-300' : ''}`}
    >
      {slotTag !== undefined && (
        <span className="text-[10px] leading-none text-gray-400">{slotTag}</span>
      )}
      {meal ? (
        <>
          <span className="w-full truncate text-sm font-medium text-gray-900">{meal.person}</span>
          {meal.place !== undefined && meal.place !== '' && (
            <span className="w-full truncate text-xs text-gray-500">{meal.place}</span>
          )}
        </>
      ) : (
        <span className="m-auto text-lg leading-none text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">
          ＋
        </span>
      )}
    </button>
  )
}

// Week view (spec 8.2). Same component, responsive switch:
// mobile = 7 stacked day rows with lunch|dinner cells; md+ = 7-column x 2-row grid.
export default function WeekGrid({ week, today, meals, onOpenSlot }: WeekGridProps) {
  const t = useT()
  const { locale } = useLocale()

  return (
    <div>
      {/* Mobile: Monday..Sunday stacked rows */}
      <div className="space-y-2 md:hidden">
        {week.map((date) => {
          const isToday = date === today
          return (
            <div
              key={date}
              className={`flex items-stretch gap-2 rounded-xl border p-2 ${
                isToday ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'
              }`}
            >
              <div
                className={`flex w-20 shrink-0 flex-col justify-center text-xs leading-tight ${
                  isToday ? 'font-semibold text-blue-700' : 'text-gray-600'
                }`}
              >
                {formatFullDate(date, locale)}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2">
                {SLOTS.map(({ slot, shortKey, fullKey }) => (
                  <SlotCell
                    key={slot}
                    meal={mealFor(meals, date, slot)}
                    highlight={false}
                    ariaLabel={`${formatFullDate(date, locale)} ${t(fullKey)}`}
                    slotTag={t(shortKey)}
                    onClick={() => onOpenSlot(date, slot)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: day headers across, lunch row + dinner row */}
      <div className="hidden md:grid md:grid-cols-[2rem_repeat(7,minmax(0,1fr))] md:gap-2">
        <div />
        {week.map((date) => (
          <div
            key={date}
            className={`rounded-lg px-1 py-1.5 text-center text-xs leading-tight ${
              date === today ? 'bg-blue-100 font-semibold text-blue-700' : 'text-gray-600'
            }`}
          >
            {formatFullDate(date, locale)}
          </div>
        ))}
        {SLOTS.map(({ slot, shortKey, fullKey }) => (
          <Fragment key={slot}>
            <div className="flex items-center justify-center text-xs text-gray-400">
              {t(shortKey)}
            </div>
            {week.map((date) => (
              <SlotCell
                key={date}
                meal={mealFor(meals, date, slot)}
                highlight={date === today}
                ariaLabel={`${formatFullDate(date, locale)} ${t(fullKey)}`}
                onClick={() => onOpenSlot(date, slot)}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
