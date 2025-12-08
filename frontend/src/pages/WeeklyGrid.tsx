import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'

import { useCreateActivity, useWeekSummary, useSports } from '@/api/hooks'
import type { Activity } from '@/api/types'
import { Button, Card, Input, Textarea } from '@/components/ui'
import type { WeekContextValue } from '@/types/week'
import { formatDisplayDate, getWeekDays } from '@/utils/date'

const defaultFormState = (weekStart: string) => ({
  date: weekStart,
  sport_id: '',
  category: '',
  duration_minutes: '',
  intensity_rpe: 5,
  notes: '',
})

const WeeklyGrid = () => {
  const { weekStart } = useOutletContext<WeekContextValue>()
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  const { data, isLoading } = useWeekSummary(weekStart)
  const { data: sports, isLoading: sportsLoading } = useSports()
  const createActivity = useCreateActivity(weekStart)

  const [formState, setFormState] = useState(() => defaultFormState(weekStart))

  useEffect(() => {
    setFormState(defaultFormState(weekStart))
  }, [weekStart])

  const activitiesByDate = useMemo(() => {
    const map: Record<string, Activity[]> = Object.fromEntries(weekDays.map((day) => [day, []]))
    data?.activities.forEach((activity) => {
      const key = activity.date.slice(0, 10)
      map[key] = [...(map[key] ?? []), activity]
    })
    return map
  }, [data?.activities, weekDays])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState.sport_id || !formState.duration_minutes) {
      return
    }

    createActivity.mutate(
      {
        sport_id: Number(formState.sport_id),
        date: formState.date,
        category: formState.category.trim() ? formState.category.trim() : undefined,
        duration_minutes: Number(formState.duration_minutes),
        intensity_rpe: Number(formState.intensity_rpe),
        notes: formState.notes || undefined,
      },
      {
        onSuccess: () => setFormState(defaultFormState(weekStart)),
      },
    )
  }

  const selectedSport = useMemo(() => {
    if (!sports || !formState.sport_id) {
      return undefined
    }
    const targetId = Number(formState.sport_id)
    return sports.find((sport) => sport.sport_id === targetId)
  }, [sports, formState.sport_id])

  const focusOptions = selectedSport?.focuses ?? []

  return (
    <section className="page-stack">
      <Card>
        <header className="card-header">
          <div>
            <p className="eyebrow">Week snapshot</p>
            <h2>Training overview</h2>
          </div>
          {data && (
            <div className="stats-row">
              <div>
                <p className="stat-label">Duration</p>
                <p className="stat-value">{data.stats.total_duration_minutes} min</p>
              </div>
              <div>
                <p className="stat-label">Sessions</p>
                <p className="stat-value">{data.stats.session_count}</p>
              </div>
              <div>
                <p className="stat-label">Avg RPE</p>
                <p className="stat-value">{data.stats.average_rpe.toFixed(1)}</p>
              </div>
            </div>
          )}
        </header>

        <div className="weekly-grid">
          {weekDays.map((day) => (
            <div key={day} className="day-column">
              <p className="day-label">{formatDisplayDate(day)}</p>
              {isLoading && !data ? (
                <p className="empty-state">Loading...</p>
              ) : activitiesByDate[day]?.length ? (
                activitiesByDate[day].map((activity) => (
                  <div key={activity.activity_id} className={`activity-chip intensity-${activity.intensity_rpe}`}>
                    <p className="activity-title">
                      Sport #{activity.sport_id}
                      {activity.category ? ` · ${activity.category}` : ''}
                    </p>
                    <p className="activity-meta">
                      {activity.duration_minutes} min · RPE {activity.intensity_rpe}
                    </p>
                    {activity.notes && <p className="activity-notes">{activity.notes}</p>}
                  </div>
                ))
              ) : (
                <p className="empty-state">Rest day</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <header className="card-header">
          <div>
            <p className="eyebrow">Log session</p>
            <h2>Add a sport</h2>
            <p className="helper-text">Use the sport IDs from your Snowflake `sports` table.</p>
          </div>
        </header>

        <form className="activity-form" onSubmit={handleSubmit}>
          <label>
            Day
            <Input
              type="date"
              value={formState.date}
              min={weekDays[0]}
              max={weekDays[weekDays.length - 1]}
              onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
          </label>
          <label>
            Sport
            <select
              className="rb-select"
              value={formState.sport_id}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  sport_id: event.target.value,
                  category: '',
                }))
              }
              disabled={sportsLoading}
            >
              <option value="">{sportsLoading ? 'Loading sports…' : 'Select a sport'}</option>
              {sports?.map((sport) => (
                <option key={sport.sport_id} value={sport.sport_id}>
                  #{sport.sport_id} · {sport.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select
              className="rb-select"
              value={formState.category}
              onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
              disabled={!focusOptions.length}
            >
              <option value="">
                {focusOptions.length ? 'Optional focus' : 'No focuses for this sport'}
              </option>
              {focusOptions.map((focus) => (
                <option key={focus.focus_id} value={focus.name}>
                  {focus.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Duration (minutes)
            <Input
              type="number"
              min={1}
              value={formState.duration_minutes}
              onChange={(event) => setFormState((prev) => ({ ...prev, duration_minutes: event.target.value }))}
              required
            />
          </label>
          <label>
            RPE (1–10)
            <Input
              type="number"
              min={1}
              max={10}
              value={formState.intensity_rpe}
              onChange={(event) => setFormState((prev) => ({ ...prev, intensity_rpe: Number(event.target.value) }))}
              required
            />
          </label>
          <label>
            Notes
            <Textarea
              rows={3}
              placeholder="How did the session feel?"
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
          <div className="form-actions">
            <Button type="submit" loading={createActivity.isPending}>
              Save activity
            </Button>
          </div>
        </form>
      </Card>
    </section>
  )
}

export default WeeklyGrid


