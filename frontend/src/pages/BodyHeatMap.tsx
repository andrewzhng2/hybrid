import { useOutletContext } from 'react-router-dom'

import { useMuscleLoad } from '@/api/hooks'
import type { MuscleLoad } from '@/api/types'
import { Badge, Card } from '@/components/ui'
import type { WeekContextValue } from '@/types/week'
import { formatWeekRange } from '@/utils/date'

const loadDescriptions: Record<string, string> = {
  white: 'Fresh',
  yellow: 'Activated',
  orange: 'Working HARD',
  red: 'OVERWORKED',
}

const BodyHeatMap = () => {
  const { weekStart } = useOutletContext<WeekContextValue>()
  console.log('BodyHeatMap mounted, weekStart =', weekStart)
  const { data, isLoading } = useMuscleLoad(weekStart)

  return (
    <section className="page-stack">
      <Card>
        <header className="card-header">
          <div>
            <p className="eyebrow">Body map</p>
            <h2>Muscle load · {formatWeekRange(weekStart)}</h2>
          </div>
          <Badge tone="warning">Experimental</Badge>
        </header>

        {isLoading || !data ? (
          <p>Loading muscle data...</p>
        ) : (
          <div className="heatmap-wrapper">
            <HeatGrid muscles={data.muscles} />
            <Legend />
          </div>
        )}
      </Card>
    </section>
  )
}

const HeatGrid = ({ muscles }: { muscles: MuscleLoad[] }) => {
  if (muscles.length === 0) {
    return <p>No muscle loads computed yet.</p>
  }

  return (
    <div className="heat-grid">
      {muscles.map((muscle) => (
        <div key={muscle.muscle_id} className={`heat-cell heat-${muscle.load_category}`}>
          <p className="cell-name">{muscle.muscle_name}</p>
          <p className="cell-score">{Math.round(muscle.load_score)}</p>
          <span className="cell-desc">{loadDescriptions[muscle.load_category]}</span>
        </div>
      ))}
    </div>
  )
}

const Legend = () => (
  <div className="heat-legend">
    {Object.entries(loadDescriptions).map(([category, label]) => (
      <div key={category} className="legend-item">
        <span className={`legend-swatch heat-${category}`} />
        <div>
          <p className="legend-label">{label}</p>
          <p className="legend-sub">{category.toUpperCase()}</p>
        </div>
      </div>
    ))}
  </div>
)

export default BodyHeatMap



