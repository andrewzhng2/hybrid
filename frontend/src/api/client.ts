import type { ActivityCreate, MuscleLoadResponse, PeriodSummary, Sport, WeekSummary } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  getWeekSummary: (weekStart: string) => request<WeekSummary>(`/week/${weekStart}`),
  getPeriodSummary: (params: { start_date?: string; end_date?: string; lifetime?: boolean }) => {
    const search = new URLSearchParams()
    if (params.start_date) search.set('start_date', params.start_date)
    if (params.end_date) search.set('end_date', params.end_date)
    if (params.lifetime) search.set('lifetime', 'true')
    return request<PeriodSummary>(`/summary?${search.toString()}`)
  },
  getMuscleLoad: (weekStart: string) => request<MuscleLoadResponse>(`/muscle-load/${weekStart}`),
  getSports: () => request<Sport[]>('/sports'),
  createActivity: (payload: ActivityCreate) =>
    request('/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateActivity: (activityId: number, payload: ActivityCreate) =>
    request(`/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteActivity: (activityId: number) =>
    request(`/activities/${activityId}`, {
      method: 'DELETE',
    }),
}



