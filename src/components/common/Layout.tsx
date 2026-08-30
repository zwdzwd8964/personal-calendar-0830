import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useT } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { useMeals } from '@/hooks/useMeals'
import { useTasks } from '@/hooks/useTasks'

const TABS: { to: string; key: MessageKey }[] = [
  { to: '/', key: 'nav.today' },
  { to: '/meals', key: 'nav.meals' },
  { to: '/tasks', key: 'nav.tasks' },
]

export default function Layout() {
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const initMeals = useMeals((s) => s.init)
  const initTasks = useTasks((s) => s.init)

  useEffect(() => {
    void initMeals()
    void initTasks()
  }, [initMeals, initTasks])

  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center px-4">
          <nav className="flex flex-1 gap-1">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`
                }
              >
                {t(tab.key)}
              </NavLink>
            ))}
          </nav>
          <div className="relative" ref={menuRef}>
            <button
              aria-label={t('menu.more')}
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg px-3 py-2 text-lg leading-none text-gray-500 hover:bg-gray-100"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <NavLink
                  to="/archive"
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('menu.archive')}
                </NavLink>
                <NavLink
                  to="/settings"
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {t('menu.settings')}
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4 pb-24">
        <Outlet />
      </main>
    </div>
  )
}
