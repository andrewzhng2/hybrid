import { useEffect, useMemo, useState, useTransition, type ChangeEvent, type FormEvent, type SVGProps } from 'react'
import { useOutletContext } from 'react-router-dom'

import { useCreateActivity, useDeleteActivity, useUpdateActivity, useWeekSummary, useSports } from '@/api/hooks'
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

const formatDuration = (totalMinutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours} hr${hours === 1 ? '' : 's'} ${minutes} min`
  }

  if (hours > 0) {
    return `${hours} hr${hours === 1 ? '' : 's'}`
  }

  return `${minutes} min`
}

const WeeklyGrid = () => {
  const { weekStart } = useOutletContext<WeekContextValue>()
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  const { data, isLoading } = useWeekSummary(weekStart)
  const { data: sports, isLoading: sportsLoading } = useSports()
  const createActivity = useCreateActivity(weekStart)
  const updateActivity = useUpdateActivity(weekStart)
  const deleteActivity = useDeleteActivity(weekStart)

  const [formState, setFormState] = useState(() => defaultFormState(weekStart))
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [, startResetTransition] = useTransition()

  useEffect(() => {
    startResetTransition(() => {
      setFormState(defaultFormState(weekStart))
      setEditingActivity(null)
    })
  }, [weekStart, startResetTransition])

  const activitiesByDate = useMemo(() => {
    const map: Record<string, Activity[]> = Object.fromEntries(weekDays.map((day) => [day, []]))
    data?.activities.forEach((activity) => {
      const key = activity.date.slice(0, 10)
      map[key] = [...(map[key] ?? []), activity]
    })
    return map
  }, [data?.activities, weekDays])

  const resetForm = () => {
    setFormState(defaultFormState(weekStart))
    setEditingActivity(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid) {
      return
    }

    const payload = {
      sport_id: Number(formState.sport_id),
      date: formState.date,
      category: formState.category.trim() ? formState.category.trim() : undefined,
      duration_minutes: Number(formState.duration_minutes),
      intensity_rpe: Number(formState.intensity_rpe),
      notes: formState.notes.trim() ? formState.notes.trim() : undefined,
    }

    if (editingActivity) {
      updateActivity.mutate(
        { activityId: editingActivity.activity_id, payload },
        {
          onSuccess: () => resetForm(),
        },
      )
    } else {
      createActivity.mutate(payload, {
        onSuccess: () => resetForm(),
      })
    }
  }

  const selectedSport = useMemo(() => {
    if (!sports || !formState.sport_id) {
      return undefined
    }
    const targetId = Number(formState.sport_id)
    return sports.find((sport) => sport.sport_id === targetId)
  }, [sports, formState.sport_id])

  const focusOptions = selectedSport?.focuses ?? []

  const sportNameById = useMemo(() => {
    if (!sports) {
      return new Map<number, string>()
    }
    return new Map(sports.map((sport) => [sport.sport_id, sport.name]))
  }, [sports])

  const handleEditClick = (activity: Activity) => {
    setEditingActivity(activity)
    setFormState({
      date: activity.date.slice(0, 10),
      sport_id: String(activity.sport_id),
      category: activity.category ?? '',
      duration_minutes: String(activity.duration_minutes),
      intensity_rpe: activity.intensity_rpe,
      notes: activity.notes ?? '',
    })
  }

  const handleSportChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSportId = event.target.value
    if (!nextSportId) {
      setFormState((prev) => ({ ...prev, sport_id: '', category: '' }))
      return
    }

    const nextSport = sports?.find((sport) => sport.sport_id === Number(nextSportId))
    const nextCategory =
      nextSport && nextSport.focuses.length ? nextSport.focuses[0].name : ''

    setFormState((prev) => ({
      ...prev,
      sport_id: nextSportId,
      category: nextCategory,
    }))
  }

  const handleDeleteClick = (activity: Activity) => {
    const confirmed = window.confirm('Delete this session? This cannot be undone.')
    if (!confirmed) {
      return
    }
    setPendingDeleteId(activity.activity_id)
    deleteActivity.mutate(activity.activity_id, {
      onSuccess: () => {
        if (editingActivity?.activity_id === activity.activity_id) {
          resetForm()
        }
      },
      onSettled: () => setPendingDeleteId(null),
    })
  }

  const isEditMode = Boolean(editingActivity)
  const isSubmitting = isEditMode ? updateActivity.isPending : createActivity.isPending
  const primaryButtonLabel = isEditMode ? 'Save changes' : 'Save activity'
  const formEyebrow = isEditMode ? 'Edit session' : 'Log session'
  const formTitle = isEditMode ? 'Update activity' : 'Add a sport'
  const helperCopy = isEditMode
    ? 'Updating an existing session. Cancel to switch back to logging.'
    : 'Check the Body Heat Map to see the activity!'

  const durationValue = Number(formState.duration_minutes)
  const intensityValue = Number(formState.intensity_rpe)
  const isFormValid = Boolean(
    formState.date &&
      formState.sport_id &&
      formState.category &&
      durationValue > 0 &&
      intensityValue >= 1 &&
      intensityValue <= 10,
  )

  return (
    <section className="page-stack">
      <Card>
        <header className="card-header">
          <div>
            <p className="eyebrow">Week snapshot</p>
            <h2>Training Overview</h2>
          </div>
          {data && (
            <div className="stats-row">
              <div>
                <p className="stat-label">Duration</p>
                <p className="stat-value">{formatDuration(data.stats.total_duration_minutes)}</p>
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
                activitiesByDate[day].map((activity) => {
                  const sportLabel = sportNameById.get(activity.sport_id) ?? `Sport #${activity.sport_id}`
                  const categoryLabel = activity.category ? ` · ${activity.category}` : ''
                  const isDeleting = pendingDeleteId === activity.activity_id && deleteActivity.isPending

                  return (
                    <div
                      key={activity.activity_id}
                      className={`activity-chip intensity-${activity.intensity_rpe}${editingActivity?.activity_id === activity.activity_id ? ' activity-chip--active' : ''}`}
                    >
                      <p className="activity-title">
                        {sportLabel}
                        {categoryLabel}
                      </p>
                      <p className="activity-meta">
                        {activity.duration_minutes} min · RPE {activity.intensity_rpe}
                      </p>
                      {activity.notes && <p className="activity-notes">{activity.notes}</p>}
                      <div className="activity-footer">
                        <button
                          type="button"
                          className="activity-action"
                          aria-label="Edit session"
                          title="Edit session"
                          onClick={() => handleEditClick(activity)}
                          disabled={isSubmitting || deleteActivity.isPending}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="activity-action activity-action--danger"
                          aria-label="Delete session"
                          title="Delete session"
                          onClick={() => handleDeleteClick(activity)}
                          disabled={isSubmitting || deleteActivity.isPending}
                        >
                          {isDeleting && <span className="sr-only">Deleting session…</span>}
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  )
                })
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
            <p className="eyebrow">{formEyebrow}</p>
            <h2>{formTitle}</h2>
            <p className="helper-text">{helperCopy}</p>
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
              onChange={handleSportChange}
              disabled={sportsLoading}
              required
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
            Sport focus
            <select
              className="rb-select"
              value={formState.category}
              onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
              disabled={!focusOptions.length}
              required
            >
              <option value="">
                {focusOptions.length ? 'Select a focus' : 'No focuses for this sport'}
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
            {isEditMode && (
              <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" loading={isSubmitting} disabled={!isFormValid}>
              {primaryButtonLabel}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  )
}

const iconBaseProps: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  role: 'img',
  'aria-hidden': true,
  focusable: 'false',
}

const EditIcon = () => (
  <svg {...iconBaseProps}>
    <path
      d="M16.5 3.5l4 4L8 20H4v-4z"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TrashIcon = () => (
  <svg {...iconBaseProps}>
    <path
      d="M5 7h14M10 11v6M14 11v6M9 7l1-2h4l1 2M8 7h8v11a2 2 0 01-2 2h-4a2 2 0 01-2-2z"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

export default WeeklyGrid


