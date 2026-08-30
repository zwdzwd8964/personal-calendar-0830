import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useT } from '@/i18n'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

// Stack of open modals so Escape only closes the top-most one (nested dialogs)
const modalStack: symbol[] = []

// Bottom sheet on mobile / centered dialog on md+, one responsive component
export default function Modal({ open, title, onClose, children }: ModalProps) {
  const t = useT()
  const idRef = useRef<symbol | null>(null)
  idRef.current ??= Symbol('modal')

  useEffect(() => {
    if (!open) return
    const id = idRef.current as symbol
    modalStack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      const i = modalStack.indexOf(id)
      if (i >= 0) modalStack.splice(i, 1)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
          <button
            aria-label={t('common.close')}
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
