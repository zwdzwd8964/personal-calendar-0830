import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ISODate, MealSlot } from '@/types'
import { useLocale, useT, weekRangeLabel } from '@/i18n'
import { addDaysISO, daysUntil, todayISO, weekOf } from '@/lib/dates'
import { mealFor, useMeals } from '@/hooks/useMeals'
import WeekGrid from '@/components/meals/WeekGrid'
import MealSlotModal from '@/components/meals/MealSlotModal'
import type { MealSlotFormValue } from '@/components/meals/MealSlotModal'

type SlotKind = MealSlot['slot']

interface EditTarget {
  date: ISODate
  slot: SlotKind
}

const EDIT_PARAM_RE = /^(\d{4}-\d{2}-\d{2}):(lunch|dinner)$/

// Shape-valid but calendar-invalid dates (e.g. 2026-13-99) must be ignored, not crash weekOf
function isValidISODate(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number)
  const parsed = new Date(y, m - 1, d)
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d
}

// Week offset of the week containing `date`, relative to the week containing `today`.
function weekOffsetOf(date: ISODate, today: ISODate): number {
  return Math.round(daysUntil(weekOf(date)[0], weekOf(today)[0]) / 7)
}

// Meals page (spec 8.2): infinite week navigation + responsive week grid + slot editor.
export default function Meals() {
  const t = useT()
  const { locale } = useLocale()
  const meals = useMeals((s) => s.meals)
  const upsert = useMeals((s) => s.upsert)
  const remove = useMeals((s) => s.remove)
  const [searchParams, setSearchParams] = useSearchParams()
  const [offset, setOffset] = useState(0)
  const [editing, setEditing] = useState<EditTarget | null>(null)

  // Cross-page contract: /meals?edit=YYYY-MM-DD:lunch|dinner opens that slot's editor,
  // navigates to the containing week, then clears the query param.
  useEffect(() => {
    const raw = searchParams.get('edit')
    if (raw === null) return
    const match = EDIT_PARAM_RE.exec(raw)
    if (match) {
      const date = match[1]
      const slot = match[2]
      if ((slot === 'lunch' || slot === 'dinner') && isValidISODate(date)) {
        setOffset(weekOffsetOf(date, todayISO()))
        setEditing({ date, slot })
      }
    }
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const today = todayISO()
  const week = weekOf(addDaysISO(today, offset * 7))
  const editingMeal = editing === null ? undefined : mealFor(meals, editing.date, editing.slot)

  const handleSave = (value: MealSlotFormValue) => {
    if (editing === null) return
    void upsert({ id: editingMeal?.id, date: editing.date, slot: editing.slot, ...value })
    setEditing(null)
  }

  const handleDelete = () => {
    if (editingMeal !== undefined) void remove(editingMeal.id)
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          ‹ {t('meals.prevWeek')}
        </button>
        <div className="flex min-w-0 flex-col items-center">
          <span className="truncate text-sm font-semibold text-gray-900">
            {weekRangeLabel(week[0], week[6], locale)}
          </span>
          {offset === 0 ? (
            <span className="text-xs font-medium text-blue-600">{t('meals.thisWeek')}</span>
          ) : (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              {t('meals.backToToday')}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          {t('meals.nextWeek')} ›
        </button>
      </div>

      <WeekGrid
        week={week}
        today={today}
        meals={meals}
        onOpenSlot={(date, slot) => setEditing({ date, slot })}
      />

      {editing !== null && (
        <MealSlotModal
          key={`${editing.date}:${editing.slot}:${editingMeal?.id ?? ''}`}
          date={editing.date}
          slot={editing.slot}
          meal={editingMeal}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
