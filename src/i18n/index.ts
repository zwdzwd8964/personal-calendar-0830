import { create } from 'zustand'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { ISODate } from '@/types'
import { zh } from './zh'
import { en } from './en'

export type Locale = 'zh' | 'en'
export type MessageKey = keyof typeof zh

const LOCALE_STORAGE_KEY = 'dtm.locale'

const dicts: Record<Locale, Record<MessageKey, string>> = { zh, en }

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw === 'zh' || raw === 'en') return raw
  } catch {
    // localStorage 不可用时回退默认语言
  }
  return 'zh'
}

interface LocaleState {
  locale: Locale
  setLocale: (l: Locale) => void
}

const useLocaleStore = create<LocaleState>((set) => ({
  locale: readStoredLocale(),
  setLocale: (l) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l)
    } catch {
      // 持久化失败不阻断切换
    }
    set({ locale: l })
  },
}))

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const dict: Record<string, string> = dicts[useLocaleStore.getState().locale]
  const template = dict[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

// 订阅 locale，使调用方组件在语言切换时重渲染
export function useT(): typeof t {
  useLocaleStore((s) => s.locale)
  return t
}

export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  return { locale, setLocale }
}

// 存储统一为 'YYYY-MM-DD'；按本地时区手动解析，避免 new Date(iso) 的 UTC 偏移。
// slice(0, 10) 兼容完整 ISO datetime 入参（如 Task.doneAt）。
function parseISO(input: string): Date {
  const [y = 1970, m = 1, d = 1] = input.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// zh '8月30日 周六' / en 'Sat, Aug 30'
export function formatFullDate(iso: ISODate, locale: Locale): string {
  const date = parseISO(iso)
  return locale === 'zh' ? format(date, 'M月d日 EEE', { locale: zhCN }) : format(date, 'EEE, MMM d')
}

// 'M/D'，如 '9/3'（中英一致）
export function formatMonthDay(iso: ISODate, locale: Locale): string {
  void locale
  return format(parseISO(iso), 'M/d')
}

// zh '8月25日 – 8月31日' / en 'Aug 25 – Aug 31'
export function weekRangeLabel(start: ISODate, end: ISODate, locale: Locale): string {
  const s = parseISO(start)
  const e = parseISO(end)
  return locale === 'zh'
    ? `${format(s, 'M月d日')} – ${format(e, 'M月d日')}`
    : `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`
}

// 入参 'yyyy-MM' 或完整 ISO；zh '2026年8月' / en 'Aug 2026'
export function monthLabel(isoDateOrMonth: string, locale: Locale): string {
  const date = parseISO(isoDateOrMonth)
  return locale === 'zh' ? format(date, 'yyyy年M月') : format(date, 'MMM yyyy')
}
