import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ChecklistItem, Task, TaskMode, TaskSize, TaskStatus } from '@/types'
import { useT } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { useTasks } from '@/hooks/useTasks'
import { newId } from '@/lib/id'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'

const SIZES: TaskSize[] = ['S', 'M', 'L', 'XL']

const STATUS_LABEL: Record<TaskStatus, MessageKey> = {
  todo: 'tasks.status.todo',
  doing: 'tasks.status.doing',
  done: 'tasks.status.done',
  shelved: 'tasks.status.shelved',
}

const labelCls = 'mb-1 block text-xs font-medium text-gray-500'
const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
const actionBtnCls =
  'rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50'

// '#xx' -> 'xx'; anything without the leading hash (or empty after it) is not a tag yet.
// Only the first whitespace-delimited token counts, so pasting '#a b ' commits 'a'
// exactly like typing it would.
function parseTag(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('#')) return null
  const tag = trimmed.slice(1).trim().split(/\s+/)[0] ?? ''
  return tag === '' ? null : tag
}

interface TaskFormDrawerProps {
  task: Task | null // null = create
  defaultMode: TaskMode
  onClose: () => void
  onCreated?: (task: Task) => void
}

// §8.3 create/edit drawer: fields shown per mode; hidden fields keep their values so
// promote/demote never loses deadline / estimate / size (§5)
export default function TaskFormDrawer({
  task,
  defaultMode,
  onClose,
  onCreated,
}: TaskFormDrawerProps) {
  const t = useT()
  const create = useTasks((s) => s.create)
  const update = useTasks((s) => s.update)
  const remove = useTasks((s) => s.remove)
  const setStatus = useTasks((s) => s.setStatus)
  const promote = useTasks((s) => s.promote)
  const demote = useTasks((s) => s.demote)

  const [title, setTitle] = useState(task?.title ?? '')
  const [mode, setMode] = useState<TaskMode>(task?.mode ?? defaultMode)
  const [important, setImportant] = useState(task?.important ?? false)
  const [urgent, setUrgent] = useState(task?.urgent ?? false)
  const [size, setSize] = useState<TaskSize | ''>(task?.size ?? '')
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  const [estimate, setEstimate] = useState(
    task?.estimateDays !== undefined ? String(task.estimateDays) : '',
  )
  const [tags, setTags] = useState<string[]>(task?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist ?? [])
  const [checkInput, setCheckInput] = useState('')
  const [note, setNote] = useState(task?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)

  // the error line sits low in a scrollable drawer — bring it into view when it appears
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest' })
  }, [error])

  const commitTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    setTagInput('')
  }

  const onTagChange = (value: string) => {
    if (value.endsWith(' ')) {
      const tag = parseTag(value)
      if (tag !== null) {
        commitTag(tag)
        return
      }
    }
    setTagInput(value)
  }

  const onTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const tag = parseTag(tagInput)
    if (tag !== null) commitTag(tag)
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((x) => x !== tag))

  const addCheckItem = () => {
    const text = checkInput.trim()
    if (text === '') return
    setChecklist((prev) => [...prev, { id: newId(), text, done: false }])
    setCheckInput('')
  }

  const onCheckKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    addCheckItem()
  }

  const toggleCheckItem = (id: string) =>
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)))

  const removeCheckItem = (id: string) => setChecklist((prev) => prev.filter((c) => c.id !== id))

  const onSave = async () => {
    const trimmedTitle = title.trim()
    if (trimmedTitle === '') {
      setError(t('tasks.titleRequired'))
      return
    }
    let estimateDays: number | undefined
    if (estimate.trim() !== '') {
      const n = Number(estimate)
      if (Number.isFinite(n) && n > 0) {
        estimateDays = n
      } else if (mode === 'firm') {
        setError(t('tasks.estimateInvalid'))
        return
      } else {
        // field is hidden in fuzzy mode: drop the invalid pending input, keep the stored value
        estimateDays = task?.estimateDays
      }
    }
    if (mode === 'firm' && deadline === '') {
      setError(t('tasks.deadlineRequired'))
      return
    }

    // fold uncommitted tag / checklist input into the save so nothing typed is lost
    let finalTags = tags
    const rawPending = tagInput.trim().replace(/^#/, '').trim().split(/\s+/)[0] ?? ''
    if (rawPending !== '' && !finalTags.includes(rawPending)) {
      finalTags = [...finalTags, rawPending]
    }
    let finalChecklist = checklist
    const pendingCheck = checkInput.trim()
    if (pendingCheck !== '') {
      finalChecklist = [...finalChecklist, { id: newId(), text: pendingCheck, done: false }]
    }

    const payload = {
      title: trimmedTitle,
      mode,
      important,
      urgent,
      size: size === '' ? undefined : size,
      deadline: deadline === '' ? undefined : deadline,
      estimateDays,
      tags: finalTags,
      checklist: finalChecklist,
      note: note.trim() === '' ? undefined : note.trim(),
    }

    try {
      if (task) {
        await update(task.id, payload)
      } else {
        const created = await create(payload)
        onCreated?.(created)
      }
      onClose()
    } catch {
      // hooks reject firm mode without a deadline
      setError(t('tasks.deadlineRequired'))
    }
  }

  const onPromote = async () => {
    if (!task) return
    // honor a deadline the user already typed in the drawer but hasn't saved yet
    if (!task.deadline && deadline !== '') {
      await update(task.id, { mode: 'firm', deadline })
      setMode('firm')
      setError(null)
      return
    }
    const ok = await promote(task.id)
    // reveal the deadline field either way; on failure ask for the deadline first
    setMode('firm')
    setError(ok ? null : t('tasks.promoteNeedsDeadline'))
  }

  const onDemote = async () => {
    if (!task) return
    await demote(task.id)
    setMode('fuzzy')
  }

  const statusActions: { label: string; to: TaskStatus }[] = []
  if (task) {
    if (task.status === 'todo') {
      statusActions.push({ label: t('tasks.action.start'), to: 'doing' })
      statusActions.push({ label: t('tasks.action.complete'), to: 'done' })
      statusActions.push({ label: t('tasks.action.shelve'), to: 'shelved' })
    } else if (task.status === 'doing') {
      statusActions.push({ label: t('tasks.action.back'), to: 'todo' })
      statusActions.push({ label: t('tasks.action.complete'), to: 'done' })
      statusActions.push({ label: t('tasks.action.shelve'), to: 'shelved' })
    } else if (task.status === 'done') {
      statusActions.push({ label: t('tasks.action.reopen'), to: 'todo' })
      statusActions.push({ label: t('tasks.action.shelve'), to: 'shelved' })
    } else {
      statusActions.push({ label: t('tasks.action.restore'), to: 'todo' })
    }
  }

  const segCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <Modal open title={t(task ? 'tasks.editTitle' : 'tasks.new')} onClose={onClose}>
      <div className="space-y-4">
        {task && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {t(STATUS_LABEL[task.status])}
            </span>
            {statusActions.map((action) => (
              <button
                key={action.label}
                onClick={() => void setStatus(task.id, action.to)}
                className={actionBtnCls}
              >
                {action.label}
              </button>
            ))}
            {task.mode === 'fuzzy' ? (
              <button
                onClick={() => void onPromote()}
                className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50"
              >
                {t('tasks.promote')}
              </button>
            ) : (
              <button onClick={() => void onDemote()} className={actionBtnCls}>
                {t('tasks.demote')}
              </button>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>{t('tasks.field.title')} *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tasks.placeholder.title')}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>{t('tasks.field.mode')}</label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            <button
              aria-pressed={mode === 'fuzzy'}
              onClick={() => setMode('fuzzy')}
              className={segCls(mode === 'fuzzy')}
            >
              {t('tasks.fuzzy')}
            </button>
            <button
              aria-pressed={mode === 'firm'}
              onClick={() => setMode('firm')}
              className={segCls(mode === 'firm')}
            >
              {t('tasks.firm')}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            aria-pressed={important}
            onClick={() => setImportant((v) => !v)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
              important
                ? 'border-red-400 bg-red-50 font-medium text-red-600'
                : 'border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            {t('tasks.field.important')}
          </button>
          <button
            aria-pressed={urgent}
            onClick={() => setUrgent((v) => !v)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
              urgent
                ? 'border-amber-400 bg-amber-50 font-medium text-amber-600'
                : 'border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            {t('tasks.field.urgent')}
          </button>
        </div>

        {mode === 'fuzzy' && (
          <div>
            <label className={labelCls}>{t('tasks.field.size')}</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as TaskSize | '')}
              className={inputCls}
            >
              <option value="">—</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'firm' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('tasks.field.deadline')} *</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('tasks.field.estimate')}</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>{t('tasks.field.tags')}</label>
          {tags.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  #{tag}
                  <button
                    aria-label={`${t('common.delete')} #${tag}`}
                    onClick={() => removeTag(tag)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            value={tagInput}
            onChange={(e) => onTagChange(e.target.value)}
            onKeyDown={onTagKeyDown}
            placeholder={t('tasks.placeholder.tags')}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>{t('tasks.field.checklist')}</label>
          {checklist.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleCheckItem(item.id)}
                    className="h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      item.done ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    aria-label={t('common.delete')}
                    onClick={() => removeCheckItem(item.id)}
                    className="shrink-0 px-1 text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={checkInput}
              onChange={(e) => setCheckInput(e.target.value)}
              onKeyDown={onCheckKeyDown}
              placeholder={t('tasks.placeholder.checklist')}
              className={inputCls}
            />
            <button
              onClick={addCheckItem}
              className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('common.add')}
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('tasks.field.note')}</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('tasks.placeholder.note')}
            className={inputCls}
          />
        </div>

        {error && (
          <p ref={errorRef} className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {task ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {t('common.delete')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void onSave()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>

      {task && (
        <ConfirmDialog
          open={confirmDelete}
          title={t('tasks.deleteConfirm')}
          danger
          confirmLabel={t('common.delete')}
          onConfirm={() => {
            setConfirmDelete(false)
            void remove(task.id)
            onClose()
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  )
}
