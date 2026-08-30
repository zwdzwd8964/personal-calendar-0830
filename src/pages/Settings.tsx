import { useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { SCHEMA_VERSION } from '@/types'
import type { AppData } from '@/types'
import { useLocale, useT } from '@/i18n'
import type { Locale, MessageKey } from '@/i18n'
import { isValidImport, useAppData } from '@/hooks/useAppData'
import { mealsToCsv, tasksToCsv } from '@/lib/csv'
import Modal from '@/components/common/Modal'
import ConfirmDialog from '@/components/common/ConfirmDialog'

const LOCALE_OPTIONS: { value: Locale; labelKey: MessageKey }[] = [
  { value: 'zh', labelKey: 'settings.language.zh' },
  { value: 'en', labelKey: 'settings.language.en' },
]

const SECONDARY_BUTTON =
  'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'

function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Element-level validation lives in hooks (isValidImport): one bad record would
// otherwise overwrite real data via replaceAll and white-screen every page.
const isImportable = isValidImport

function Section({
  title,
  danger,
  children,
}: {
  title: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={`rounded-xl border p-4 ${
        danger ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
      }`}
    >
      <h2 className={`mb-3 text-sm font-semibold ${danger ? 'text-red-700' : 'text-gray-700'}`}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function Settings() {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const { ready, isEmpty, exportData, importData, clearAll, loadSeedData } = useAppData()

  const [importPreview, setImportPreview] = useState<AppData | null>(null)
  const [importError, setImportError] = useState(false)
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0)

  const handleExportJson = () => {
    downloadFile('dtm-export.json', JSON.stringify(exportData(), null, 2), 'application/json')
  }

  const handleExportCsvMeals = () => {
    downloadFile('meals.csv', mealsToCsv(exportData().meals), 'text/csv;charset=utf-8')
  }

  const handleExportCsvTasks = () => {
    downloadFile('tasks.csv', tasksToCsv(exportData().tasks), 'text/csv;charset=utf-8')
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    // Reset regardless of outcome so re-picking the same file fires change again.
    input.value = ''
    if (!file) return
    void file
      .text()
      .then((text) => {
        let parsed: unknown
        try {
          parsed = JSON.parse(text)
        } catch {
          setImportError(true)
          return
        }
        if (!isImportable(parsed)) {
          setImportError(true)
          return
        }
        setImportError(false)
        setImportPreview({
          schemaVersion: SCHEMA_VERSION,
          meals: parsed.meals,
          tasks: parsed.tasks,
        })
      })
      .catch(() => setImportError(true))
  }

  const handleImportConfirm = () => {
    if (!importPreview) return
    void importData(importPreview)
      .then(() => setImportPreview(null))
      .catch(() => {
        setImportPreview(null)
        setImportError(true)
      })
  }

  const handleClearConfirmFinal = () => {
    setClearStep(0)
    void clearAll()
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t('settings.title')}</h1>

      <div className="space-y-4">
        <Section title={t('settings.language')}>
          <div className="inline-flex rounded-lg bg-gray-100 p-1" role="group">
            {LOCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLocale(opt.value)}
                aria-pressed={locale === opt.value}
                className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                  locale === opt.value
                    ? 'bg-white font-medium text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('settings.export')}>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportJson} disabled={!ready} className={SECONDARY_BUTTON}>
              {t('settings.exportJson')}
            </button>
            <button onClick={handleExportCsvMeals} disabled={!ready} className={SECONDARY_BUTTON}>
              {t('settings.exportCsvMeals')}
            </button>
            <button onClick={handleExportCsvTasks} disabled={!ready} className={SECONDARY_BUTTON}>
              {t('settings.exportCsvTasks')}
            </button>
          </div>
        </Section>

        <Section title={t('settings.import')}>
          <label className={`inline-block cursor-pointer ${SECONDARY_BUTTON}`}>
            {t('settings.import')}
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          {importError && (
            <p className="mt-2 text-sm text-red-600">{t('settings.importInvalid')}</p>
          )}
        </Section>

        <Section title={t('settings.loadSeed')}>
          <button
            onClick={() => void loadSeedData()}
            disabled={!ready || !isEmpty}
            className={SECONDARY_BUTTON}
          >
            {t('settings.loadSeed')}
          </button>
          <p className="mt-2 text-xs text-gray-400">{t('settings.loadSeedHint')}</p>
        </Section>

        <Section title={t('settings.danger')} danger>
          <button
            onClick={() => setClearStep(1)}
            disabled={!ready}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('settings.clearAll')}
          </button>
        </Section>
      </div>

      <Modal
        open={importPreview !== null}
        title={t('settings.import')}
        onClose={() => setImportPreview(null)}
      >
        {importPreview && (
          <>
            <p className="mb-2 text-sm text-gray-800">
              {t('settings.importPreview', {
                meals: importPreview.meals.length,
                tasks: importPreview.tasks.length,
              })}
            </p>
            <p className="mb-4 text-sm text-gray-600">{t('settings.importConfirm')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setImportPreview(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleImportConfirm}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('common.confirm')}
              </button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={clearStep === 1}
        title={t('settings.clearAll')}
        message={t('settings.clearAllConfirm1')}
        onConfirm={() => setClearStep(2)}
        onCancel={() => setClearStep(0)}
      />
      <ConfirmDialog
        open={clearStep === 2}
        title={t('settings.clearAll')}
        message={t('settings.clearAllConfirm2')}
        danger
        onConfirm={handleClearConfirmFinal}
        onCancel={() => setClearStep(0)}
      />
    </div>
  )
}
