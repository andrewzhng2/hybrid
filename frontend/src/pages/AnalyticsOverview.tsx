import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { useWeekSummary } from '@/api/hooks'
import { Badge, Card, Tabs } from '@/components/ui'
import type { WeekContextValue } from '@/types/week'
import { formatDisplayDate } from '@/utils/date'

const tabOptions = [
  { id: 'overview', label: 'Overview' },
  { id: 'sports', label: 'Sports' },
]

const AnalyticsOverview = () => {
  const { weekStart } = useOutletContext<WeekContextValue>()
  const { data, isLoading } = useWeekSummary(weekStart)
  const [activeTab, setActiveTab] = useState(tabOptions[0].id)

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
          <div className="analytics-grid">
            <div className="metric-card">
              <p className="metric-label">Total minutes</p>
              <p className="metric-value">{data.stats.total_duration_minutes}</p>
              <p className="metric-footnote">Accumulates the duration of every activity session.</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Avg RPE</p>
              <p className="metric-value">{data.stats.average_rpe.toFixed(1)}</p>
              <p className="metric-footnote">Helps spot redline weeks early.</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Sport count</p>
              <p className="metric-value">{data.stats.sport_breakdown.length}</p>
              <p className="metric-footnote">Unique sports logged this week.</p>
            </div>
          </div>
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
                        {sport.total_duration_minutes} min · {sport.session_count} sessions
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
    </section>
  )
}

export default AnalyticsOverview


