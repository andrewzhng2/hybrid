const DAY_IN_MS = 1000 * 60 * 60 * 24

export const startOfWeek = (target: Date): Date => {
  const daysSinceSunday = (target.getDay() + 7 - 0) % 7
  const start = new Date(target)
  start.setHours(0, 0, 0, 0)
  start.setTime(start.getTime() - daysSinceSunday * DAY_IN_MS)
  return start
}

export const startOfWeekIso = (target: Date): string => toIsoDate(startOfWeek(target))

export const shiftWeek = (weekStartIso: string, deltaWeeks: number): string => {
  const date = new Date(weekStartIso)
  const shifted = new Date(date.getTime() + deltaWeeks * 7 * DAY_IN_MS)
  return toIsoDate(startOfWeek(shifted))
}

export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const formatWeekRange = (weekStartIso: string): string => {
  const start = new Date(weekStartIso)
  const end = new Date(start.getTime() + 6 * DAY_IN_MS)
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

export const getWeekDays = (weekStartIso: string): string[] => {
  const weekStart = new Date(weekStartIso)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart.getTime() + index * DAY_IN_MS)
    return toIsoDate(day)
  })
}

export const formatDisplayDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })



