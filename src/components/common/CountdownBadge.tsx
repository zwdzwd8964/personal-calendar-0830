import type { ISODate } from '@/types'
import { daysUntil, todayISO } from '@/lib/dates'
import { useT } from '@/i18n'

// Countdown badge (§7): >3d gray, 1-3d amber, due-today/overdue red with overdue-n-days copy
export default function CountdownBadge({ deadline }: { deadline: ISODate }) {
  const t = useT()
  const n = daysUntil(deadline, todayISO())
  const cls =
    n <= 0
      ? 'bg-red-100 text-red-700'
      : n <= 3
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600'
  const label =
    n < 0
      ? t('countdown.overdue', { n: -n })
      : n === 0
        ? t('countdown.dueToday')
        : t('countdown.daysLeft', { n })
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  )
}
