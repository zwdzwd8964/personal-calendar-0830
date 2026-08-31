import type { ISODate, MealSlot } from '@/types'
import { getSupabaseClient, isSupabaseConfigured } from '@/storage/supabaseClient'

export type MealDraft = Pick<MealSlot, 'date' | 'slot' | 'person'> &
  Partial<Pick<MealSlot, 'place' | 'note'>>

// 语音解析走云端 Edge Function（§10）：本地模式隐藏入口
export function isVoiceParsingAvailable(): boolean {
  return isSupabaseConfigured()
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const parsed = new Date(y, m - 1, d)
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

// 服务端已按 JSON schema 约束，这里再做一次不信任校验：坏一条整体拒绝（§10）
export function sanitizeDrafts(payload: unknown): MealDraft[] {
  if (!isRecord(payload) || !Array.isArray(payload.drafts)) {
    throw new Error('invalid parse payload')
  }
  return payload.drafts.map((item) => {
    if (!isRecord(item)) throw new Error('invalid draft')
    const { date, slot, person, place, note } = item
    if (typeof date !== 'string' || !isValidDateString(date)) throw new Error('invalid draft date')
    if (slot !== 'lunch' && slot !== 'dinner') throw new Error('invalid draft slot')
    if (typeof person !== 'string' || person.trim() === '') {
      throw new Error('invalid draft person')
    }
    return {
      date,
      slot,
      person: person.trim(),
      ...(typeof place === 'string' && place.trim() !== '' ? { place: place.trim() } : {}),
      ...(typeof note === 'string' && note.trim() !== '' ? { note: note.trim() } : {}),
    }
  })
}

function currentLocale(): 'zh' | 'en' {
  try {
    return localStorage.getItem('dtm.locale') === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export async function parseMealUtterance(text: string, refDate: ISODate): Promise<MealDraft[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('voice parsing requires cloud mode')
  }
  const { data, error } = await getSupabaseClient().functions.invoke('parse-meal', {
    body: { text, refDate, locale: currentLocale() },
  })
  if (error) throw error
  return sanitizeDrafts(data)
}
