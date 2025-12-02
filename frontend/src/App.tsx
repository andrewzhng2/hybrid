import { useCallback, useEffect, useMemo } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useSearchParams } from 'react-router-dom'

import WeekSelector from '@/components/WeekSelector'
import BodyHeatMap from '@/pages/BodyHeatMap'
import AnalyticsOverview from '@/pages/AnalyticsOverview'
import WeeklyGrid from '@/pages/WeeklyGrid'
import type { WeekContextValue } from '@/types/week'
import { formatWeekRange, startOfWeekIso } from '@/utils/date'

const navLinks = [
  { href: '/weekly', label: 'Week Planner' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/body', label: 'Body Heat Map' },
]

const AppLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const defaultWeek = useMemo(() => startOfWeekIso(new Date()), [])
  const currentWeek = searchParams.get('week') ?? defaultWeek

  useEffect(() => {
    if (!searchParams.get('week')) {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('week', defaultWeek)
          return params
        },
        { replace: true },
      )
    }
  }, [defaultWeek, searchParams, setSearchParams])

  const setWeekStart = useCallback(
    (nextIso: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('week', nextIso)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">Hybrid</span>
          <p className="brand-copy">Train like an all-around athlete</p>
        </div>
        <nav className="primary-nav">
          {navLinks.map((link) => (
            <NavLink key={link.href} to={link.href} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <WeekSelector
          label={formatWeekRange(currentWeek)}
          weekStart={currentWeek}
          onWeekChange={setWeekStart}
        />
      </header>
      <main className="app-content">
        <Outlet context={{ weekStart: currentWeek, setWeekStart } satisfies WeekContextValue} />
      </main>
    </div>
  )
}

const App = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<Navigate to="/weekly" replace />} />
      <Route path="/weekly" element={<WeeklyGrid />} />
      <Route path="/analytics" element={<AnalyticsOverview />} />
      <Route path="/body" element={<BodyHeatMap />} />
    </Route>
  </Routes>
)

export default App
