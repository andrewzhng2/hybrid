import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { usePeriodSummary, useWeekSummary } from '@/api/hooks'
import { Badge, Card, Tabs } from '@/components/ui'
import type { WeekContextValue } from '@/types/week'
import { formatDisplayDate, toIsoDate } from '@/utils/date'

const tabOptions = [
  { id: 'overview', label: 'Overview' },
  { id: 'sports', label: 'Sports' },
]

const AnalyticsOverview = () => {
  const { weekStart } = useOutletContext<WeekContextValue>()
  const { data, isLoading } = useWeekSummary(weekStart)
  const [activeTab, setActiveTab] = useState(tabOptions[0].id)

  const weekDate = new Date(`${weekStart}T00:00:00Z`)
  const monthStart = new Date(Date.UTC(weekDate.getUTCFullYear(), weekDate.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(weekDate.getUTCFullYear(), weekDate.getUTCMonth() + 1, 0))
  const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1))
  const yearEnd = new Date(Date.UTC(weekDate.getUTCFullYear(), 11, 31))

  const { data: monthSummary, isLoading: isLoadingMonth } = usePeriodSummary({
    start_date: toIsoDate(monthStart),
    end_date: toIsoDate(monthEnd),
  })
  const { data: yearSummary, isLoading: isLoadingYear } = usePeriodSummary({
    start_date: toIsoDate(yearStart),
    end_date: toIsoDate(yearEnd),
  })
  const { data: lifetimeSummary, isLoading: isLoadingLifetime } = usePeriodSummary({
    lifetime: true,
  })

  const formatDuration = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) {
      return `${minutes}m`
    }
    return `${hours}h ${minutes}m`
  }

  const hybridGrade = (count: number) => {
    if (count <= 0) return 'F'
    if (count === 1) return 'D'
    if (count === 2) return 'C'
    if (count === 3) return 'B'
    if (count === 4) return 'A'
    if (count === 5) return 'A+'
    if (count === 6) return 'S'
    return 'S+'
  }

  const SportCountCard = ({ count, footnote }: { count: number; footnote: string }) => (
    <div className="metric-card">
      <p className="metric-label">Sport Count</p>
      <p className="metric-value">{count}</p>
      <p className="metric-footnote" style={{ marginTop: '0.75rem' }}>
        {footnote}
      </p>
    </div>
  )

  const HybridCard = ({ count }: { count: number }) => (
    <div className="metric-card">
      <p className="metric-label">Hybrid Grade</p>
      <p className="metric-value">{hybridGrade(count)}</p>
      <p className="metric-footnote" style={{ marginTop: '0.75rem' }}>
        Your athlete grade based on sport variety.
      </p>
    </div>
  )

  const renderMetrics = (stats: { total_duration_minutes: number; average_rpe: number; sport_breakdown: { length: number } }, footnote: string) => (
    <div
      className="analytics-grid"
      style={{
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
      }}
    >
      <div className="metric-card" style={{ height: '100%' }}>
        <p className="metric-label">Time Spent</p>
        <p className="metric-value">{formatDuration(stats.total_duration_minutes)}</p>
        <p className="metric-footnote">Accumulates the duration of every activity session.</p>
      </div>
      <div className="metric-card">
        <p className="metric-label">Avg RPE</p>
        <p className="metric-value">{stats.average_rpe.toFixed(1)}</p>
        <p className="metric-footnote">Helps spot redline weeks early.</p>
      </div>
      <SportCountCard count={stats.sport_breakdown.length} footnote={footnote} />
      <HybridCard count={stats.sport_breakdown.length} />
    </div>
  )

  const renderSummarySection = (
    title: string,
    summary?: { stats: { total_duration_minutes: number; average_rpe: number; sport_breakdown: { length: number } } },
    loading?: boolean,
  ) => (
    <Card>
      <header className="card-header">
        <div>
          <p className="eyebrow">{title}</p>
        </div>
      </header>
      {loading || !summary ? (
        <p style={{ padding: '0 1.5rem 1.5rem' }}>Loading analytics...</p>
      ) : (
        renderMetrics(summary.stats, 'Unique sports logged in this period.')
      )}
    </Card>
  )

  if (isLoading || !data) {
    return (
      <section className="page-stack">
        <Card>
          <p>Loading analytics...</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="page-stack">
      <Card>
        <header className="card-header">
          <div>
            <p className="eyebrow">Analytics</p>
            <h2>Week of {formatDisplayDate(data.week_start_date)}</h2>
          </div>
          <Badge tone="info">{data.activities.length} logged sessions</Badge>
        </header>
        <Tabs tabs={tabOptions} activeTab={activeTab} onValueChange={setActiveTab} />

        {activeTab === 'overview' ? (
          renderMetrics(data.stats, 'Unique sports logged this week.')
        ) : (
          <div className="sport-breakdown">
            {data.stats.sport_breakdown.length === 0 ? (
              <p>No sport distribution yet.</p>
            ) : (
              data.stats.sport_breakdown.map((sport) => {
                const percentage =
                  data.stats.total_duration_minutes === 0
                    ? 0
                    : Math.round((sport.total_duration_minutes / data.stats.total_duration_minutes) * 100)
                return (
                  <div key={sport.sport_id} className="sport-row">
                    <div>
                      <p className="sport-name">
                        #{sport.sport_id} · {sport.sport_name}
                      </p>
                      <p className="sport-meta">
                        {formatDuration(sport.total_duration_minutes)} · {sport.session_count} sessions
                      </p>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="percentage-label">{percentage}%</span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </Card>

      {activeTab === 'overview' && (
        <>
          {renderSummarySection(
            `Month of ${monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}`,
            monthSummary,
            isLoadingMonth,
          )}
          {renderSummarySection(`Year ${yearStart.getUTCFullYear()}`, yearSummary, isLoadingYear)}
          {renderSummarySection('Lifetime', lifetimeSummary, isLoadingLifetime)}
        </>
      )}
    </section>
  )
}

export default AnalyticsOverview


