import { useRef, useState } from 'react'
import type { MealDraft } from '@/voice/parseMeal'
import { isVoiceParsingAvailable, parseMealUtterance } from '@/voice/parseMeal'
import { todayISO } from '@/lib/dates'
import { formatFullDate, useLocale, useT } from '@/i18n'
import { mealFor, useMeals } from '@/hooks/useMeals'
import Modal from '@/components/common/Modal'

// Minimal typings for the Web Speech API (not in TS dom lib on every config)
interface SpeechAlternativeLike {
  transcript: string
}
interface SpeechResultLike {
  0: SpeechAlternativeLike
}
interface SpeechResultEventLike {
  results: ArrayLike<SpeechResultLike>
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechResultEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function speechCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// §10 voice entry: mic (when supported) + typed-sentence fallback -> drafts -> upsert.
// Hidden entirely in local mode (isVoiceParsingAvailable).
export default function VoiceCapture() {
  const t = useT()
  const { locale } = useLocale()
  const meals = useMeals((s) => s.meals)
  const upsert = useMeals((s) => s.upsert)

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [drafts, setDrafts] = useState<MealDraft[] | null>(null)
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const supported = speechCtor() !== null

  if (!isVoiceParsingAvailable()) return null

  const stopListening = () => {
    recRef.current?.stop()
    recRef.current = null
    setListening(false)
  }

  const close = () => {
    stopListening()
    setOpen(false)
    setText('')
    setDrafts(null)
    setFailed(false)
    setParsing(false)
    setSaved(new Set())
  }

  const startListening = () => {
    const Ctor = speechCtor()
    if (Ctor === null || listening) return
    const rec = new Ctor()
    rec.lang = locale === 'zh' ? 'zh-CN' : 'en-US'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i += 1) transcript += e.results[i][0].transcript
      setText(transcript)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const onParse = async () => {
    const value = text.trim()
    if (value === '' || parsing) return
    stopListening()
    setParsing(true)
    setFailed(false)
    setDrafts(null)
    try {
      const result = await parseMealUtterance(value, todayISO())
      if (result.length === 0) {
        setFailed(true)
      } else {
        setDrafts(result)
        setSaved(new Set())
      }
    } catch {
      setFailed(true)
    } finally {
      setParsing(false)
    }
  }

  const saveDraft = async (index: number) => {
    if (drafts === null || saved.has(index)) return
    const d = drafts[index]
    await upsert({ date: d.date, slot: d.slot, person: d.person, place: d.place, note: d.note })
    setSaved((prev) => new Set(prev).add(index))
  }

  const saveAll = async () => {
    if (drafts === null) return
    // sequential on purpose: keeps slot-collision handling deterministic
    for (let i = 0; i < drafts.length; i += 1) {
      await saveDraft(i)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        <span aria-hidden>🎤</span> {t('voice.button')}
      </button>

      <Modal open={open} title={t('voice.title')} onClose={close}>
        <div className="space-y-3">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('voice.placeholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            {supported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  listening
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {listening ? t('voice.stop') : t('voice.start')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void onParse()}
              disabled={parsing || text.trim() === ''}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {parsing ? t('voice.parsing') : t('voice.parse')}
            </button>
          </div>
          {listening && <p className="text-xs text-amber-600">{t('voice.listening')}</p>}
          {!supported && <p className="text-xs text-gray-400">{t('voice.unsupported')}</p>}
          {failed && <p className="text-sm text-red-600">{t('voice.parseFailed')}</p>}

          {drafts !== null && (
            <div className="space-y-2 pt-1">
              {drafts.map((d, i) => {
                const occupant = mealFor(meals, d.date, d.slot)
                const willOverwrite =
                  occupant !== undefined && !saved.has(i) && occupant.person !== d.person
                return (
                  <div
                    key={`${d.date}:${d.slot}:${i}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-500">
                        {formatFullDate(d.date, locale)} ·{' '}
                        {t(d.slot === 'lunch' ? 'today.lunch' : 'today.dinner')}
                      </div>
                      <div className="truncate text-sm font-semibold text-gray-900">{d.person}</div>
                      {d.place !== undefined && (
                        <div className="truncate text-xs text-gray-500">{d.place}</div>
                      )}
                      {d.note !== undefined && (
                        <div className="truncate text-xs text-gray-400">{d.note}</div>
                      )}
                      {willOverwrite && (
                        <div className="mt-1 text-xs text-amber-600">
                          {t('voice.overwriteHint', { person: occupant.person })}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void saveDraft(i)}
                      disabled={saved.has(i)}
                      className="shrink-0 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:border-gray-200 disabled:text-gray-400"
                    >
                      {saved.has(i) ? t('voice.saved') : t('voice.save')}
                    </button>
                  </div>
                )
              })}
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => void saveAll()}
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  {t('voice.saveAll')}
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
