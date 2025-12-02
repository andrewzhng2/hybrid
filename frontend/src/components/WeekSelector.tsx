import { Button } from './ui'
import { shiftWeek } from '@/utils/date'

interface WeekSelectorProps {
  label: string
  weekStart: string
  onWeekChange: (isoDate: string) => void
}

const WeekSelector = ({ label, weekStart, onWeekChange }: WeekSelectorProps) => {
  const goPrevious = () => onWeekChange(shiftWeek(weekStart, -1))
  const goNext = () => onWeekChange(shiftWeek(weekStart, 1))

  return (
    <div className="week-selector">
      <Button variant="ghost" size="sm" onClick={goPrevious}>
        ← Prev
      </Button>
      <div className="week-label">
        <span>{label}</span>
        <input
          type="date"
          value={weekStart}
          onChange={(event) => onWeekChange(event.target.value)}
          className="rb-input week-input"
        />
      </div>
      <Button variant="ghost" size="sm" onClick={goNext}>
        Next →
      </Button>
    </div>
  )
}

export default WeekSelector



