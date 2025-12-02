const DAY_IN_MS = 1000 * 60 * 60 * 24
const UTC_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const UTC_RANGE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

export const startOfWeek = (target: Date): Date => {
  const start = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()))
  const daysSinceMonday = (start.getUTCDay() + 6) % 7
  start.setUTCDate(start.getUTCDate() - daysSinceMonday)
  return start
}

export const startOfWeekIso = (target: Date): string => toIsoDate(startOfWeek(target))

export const shiftWeek = (weekStartIso: string, deltaWeeks: number): string => {
  const date = new Date(`${weekStartIso}T00:00:00Z`)
  const shifted = new Date(date.getTime() + deltaWeeks * 7 * DAY_IN_MS)
  return toIsoDate(startOfWeek(shifted))
}

export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const formatWeekRange = (weekStartIso: string): string => {
  const start = new Date(`${weekStartIso}T00:00:00Z`)
  const end = new Date(start.getTime() + 6 * DAY_IN_MS)
  const startLabel = UTC_RANGE_FORMATTER.format(start)
  const endLabel = UTC_RANGE_FORMATTER.format(end)
  return `${startLabel} – ${endLabel}`
}

export const getWeekDays = (weekStartIso: string): string[] => {
  const weekStart = new Date(`${weekStartIso}T00:00:00Z`)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart.getTime() + index * DAY_IN_MS)
    return toIsoDate(day)
  })
}

export const formatDisplayDate = (isoDate: string): string =>
  UTC_DATE_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`))



