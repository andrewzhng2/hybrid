import { useOutletContext } from 'react-router-dom'

import { BackFigure, FrontFigure } from '@/assets/body'
import { useMuscleLoad } from '@/api/hooks'
import type { MuscleLoad } from '@/api/types'
import { Badge, Card } from '@/components/ui'
import type { WeekContextValue } from '@/types/week'
import { formatWeekRange } from '@/utils/date'
import {
  bodyRegions,
  findRegionsForMuscle,
  loadCategoryToClass,
  type BodyRegion,
  type FigureSide,
} from './bodyRegions'

const loadDescriptions: Record<string, string> = {
  white: 'Fresh',
  yellow: 'Activated',
  orange: 'Working HARD',
  red: 'OVERWORKED',
}

const BodyHeatMap = () => {
  const { weekStart } = useOutletContext<WeekContextValue>()
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
          <>
            <div className="heatmap-wrapper">
              <BodyOverlay muscles={data.muscles} />
            </div>
            <Legend />
          </>
        )}
      </Card>
    </section>
  )
}

const figures: { side: FigureSide; Component: typeof FrontFigure }[] = [
  { side: 'front', Component: FrontFigure },
  { side: 'back', Component: BackFigure },
]

const BodyOverlay = ({ muscles }: { muscles: MuscleLoad[] }) => {
  if (muscles.length === 0) {
    return <p>No muscle loads computed yet.</p>
  }

  const regionLoads = new Map<string, MuscleLoad>()
  const unmatched: MuscleLoad[] = []

  muscles.forEach((muscle) => {
    const matches = findRegionsForMuscle(muscle)
    if (matches.length === 0) {
      unmatched.push(muscle)
      return
    }

    matches.forEach((region) => {
      if (!regionLoads.has(region.id)) {
        regionLoads.set(region.id, muscle)
      }
    })
  })

  return (
    <div className="body-heat-map">
      <div className="figure-grid">
        {figures.map(({ side, Component }) => (
          <div key={side} className={`figure figure-${side}`}>
            <Component className="figure-svg" aria-hidden="true" />
            <div className="region-layer">
              {bodyRegions
                .filter((region) => region.figure === side)
                .map((region) => (
                  <RegionSwatch
                    key={region.id}
                    region={region}
                    load={regionLoads.get(region.id) ?? null}
                  />
                ))}
            </div>
          </div>
        ))}
        {unmatched.length > 0 && <FallbackSwatch muscles={unmatched} />}
      </div>
    </div>
  )
}

const RegionSwatch = ({
  region,
  load,
}: {
  region: BodyRegion
  load: MuscleLoad | null
}) => {
  const style = {
    top: `${region.bounds.top}%`,
    left: `${region.bounds.left}%`,
    width: `${region.bounds.width}%`,
    height: `${region.bounds.height}%`,
  }

  const categoryClass = load ? loadCategoryToClass(load.load_category) : 'heat-white'
  const title = load
    ? `${region.label}: ${Math.round(load.load_score)} (${load.load_category})`
    : `${region.label}: no data`

  return (
    <div className={`muscle-region ${categoryClass}`} style={style} title={title}>
      <span className="region-label">{region.label}</span>
      {load ? (
        <span className="region-score">{Math.round(load.load_score)}</span>
      ) : (
        <span className="region-score region-score--empty">—</span>
      )}
    </div>
  )
}

const FallbackSwatch = ({ muscles }: { muscles: MuscleLoad[] }) => (
  <div className="fallback-region">
    <span className="region-label">Other muscles</span>
    <div className="fallback-grid">
      {muscles.map((muscle) => (
        <span
          key={muscle.muscle_id}
          className={`fallback-pill ${loadCategoryToClass(muscle.load_category)}`}
          title={`${muscle.muscle_name}: ${Math.round(muscle.load_score)}`}
        >
          <span className="fallback-name">{muscle.muscle_name}</span>
          <span className="fallback-score">{Math.round(muscle.load_score)}</span>
        </span>
      ))}
    </div>
  </div>
)

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



