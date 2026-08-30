import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ISODate, MealSlot } from '@/types'
import { formatFullDate, useLocale, useT } from '@/i18n'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'

export interface MealSlotFormValue {
  person: string
  place?: string
  note?: string
}

interface MealSlotModalProps {
  date: ISODate
  slot: MealSlot['slot']
  meal?: MealSlot
  onSave: (value: MealSlotFormValue) => void
  onDelete: () => void
  onClose: () => void
}

// Slot editor (spec 8.2): person required, place/note optional; delete needs confirmation.
// Parent mounts a fresh instance per (date, slot) target, so initial state comes from props.
export default function MealSlotModal({
  date,
  slot,
  meal,
  onSave,
  onDelete,
  onClose,
}: MealSlotModalProps) {
  const t = useT()
  const { locale } = useLocale()
  const [person, setPerson] = useState(meal?.person ?? '')
  const [place, setPlace] = useState(meal?.place ?? '')
  const [note, setNote] = useState(meal?.note ?? '')
  const [showError, setShowError] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedPerson = person.trim()
    if (trimmedPerson === '') {
      setShowError(true)
      return
    }
    const trimmedPlace = place.trim()
    const trimmedNote = note.trim()
    onSave({
      person: trimmedPerson,
      place: trimmedPlace === '' ? undefined : trimmedPlace,
      note: trimmedNote === '' ? undefined : trimmedNote,
    })
  }

  return (
    <>
      {/* Hide (not unmount) the editor while confirming delete: form state lives here,
          and stacked modals would both react to the shared Escape handler. */}
      <Modal
        open={!confirmingDelete}
        title={meal ? t('meals.editTitle') : t('meals.newTitle')}
        onClose={onClose}
      >
        <p className="-mt-2 mb-4 text-sm text-gray-500">
          {formatFullDate(date, locale)} · {t(slot === 'lunch' ? 'meals.lunch' : 'meals.dinner')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="meal-person" className="mb-1 block text-sm font-medium text-gray-700">
              {t('meals.person')} <span className="text-red-500">*</span>
            </label>
            <input
              id="meal-person"
              autoFocus
              value={person}
              onChange={(e) => {
                setPerson(e.target.value)
                if (showError) setShowError(false)
              }}
              placeholder={t('meals.personPlaceholder')}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                showError
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-blue-200'
              }`}
            />
            {showError && <p className="mt-1 text-xs text-red-600">{t('meals.personRequired')}</p>}
          </div>
          <div>
            <label htmlFor="meal-place" className="mb-1 block text-sm font-medium text-gray-700">
              {t('meals.place')}
            </label>
            <input
              id="meal-place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder={t('meals.placePlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label htmlFor="meal-note" className="mb-1 block text-sm font-medium text-gray-700">
              {t('meals.note')}
            </label>
            <textarea
              id="meal-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('meals.notePlaceholder')}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            {meal && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                {t('common.delete')}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirmingDelete}
        title={t('meals.deleteConfirm')}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  )
}
