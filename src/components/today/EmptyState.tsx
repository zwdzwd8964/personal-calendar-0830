import { useT } from '@/i18n'

interface EmptyStateProps {
  onLoadSeed: () => void
  onStartFresh: () => void
}

// §8.1 global empty state: title + subtitle + load-seed / start-fresh actions
export default function EmptyState({ onLoadSeed, onStartFresh }: EmptyStateProps) {
  const t = useT()
  return (
    <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="text-lg font-semibold text-gray-900">{t('today.emptyTitle')}</div>
      <p className="mt-2 text-sm text-gray-500">{t('today.emptySubtitle')}</p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          onClick={onLoadSeed}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {t('today.loadSeed')}
        </button>
        <button
          onClick={onStartFresh}
          className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {t('today.startFresh')}
        </button>
      </div>
    </div>
  )
}
