import { useT } from '@/i18n'

interface TagFilterProps {
  tags: string[]
  selected: string[]
  onToggle: (tag: string) => void
}

// §8.3 tag filter: multi-select chips, OR logic; none selected = show all (both columns)
export default function TagFilter({ tags, selected, onToggle }: TagFilterProps) {
  const t = useT()
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-gray-400">{t('tasks.tagFilter')}</span>
      {tags.map((tag) => {
        const active = selected.includes(tag)
        return (
          <button
            key={tag}
            aria-pressed={active}
            onClick={() => onToggle(tag)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              active
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            #{tag}
          </button>
        )
      })}
    </div>
  )
}
