import { useOutletContext } from 'react-router-dom'

import { BackFigure, FrontFigure } from '@/assets/body'
import { useMuscleLoad } from '@/api/hooks'
import type { LoadCategory, MuscleLoad } from '@/api/types'
import { Badge, Card } from '@/components/ui'
import type { WeekContextValue } from '@/types/week'
import { formatWeekRange } from '@/utils/date'
import {
  bodyRegions,
  findRegionsForMuscle,
  loadCategoryToClass,
  type BodyRegion,
} from './bodyRegions'

const loadDescriptions: Array<{
  category: LoadCategory
  label: string
  helper: string
}> = [
  { category: 'white', label: 'No data', helper: 'Nothing logged' },
  { category: 'blue', label: 'Under-used', helper: 'ACWR below target' },
  { category: 'green', label: 'In the zone', helper: 'ACWR on target' },
  { category: 'yellow', label: 'Building', helper: 'ACWR slightly elevated' },
  { category: 'orange', label: 'Pushing', helper: 'ACWR high' },
  { category: 'red', label: 'Overworked', helper: 'ACWR very high' },
]

const formatAcwr = (value: number) => value.toFixed(2)

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

const normalizeMuscleName = (value: string) => value.trim().toLowerCase()
const muscleSlug = (value: string) => normalizeMuscleName(value).replace(/[^a-z]/g, '')
const forcedOtherAliases = new Set([
  'lats',
  'lat',
  'latissimus',
  'latissimusdorsi',
  'adductors',
  'adductor',
  'balance',
  'footwork',
  'stability',
])

const BodyOverlay = ({ muscles }: { muscles: MuscleLoad[] }) => {
  if (muscles.length === 0) {
    return <p>No muscle loads computed yet.</p>
  }

  const regionLoads = new Map<string, MuscleLoad>()
  const otherMuscles: MuscleLoad[] = []

  muscles.forEach((muscle) => {
    const slug = muscleSlug(muscle.muscle_name)
    if (forcedOtherAliases.has(slug)) {
      otherMuscles.push(muscle)
      return
    }

    const matches = findRegionsForMuscle(muscle)
    if (matches.length === 0) {
      otherMuscles.push(muscle)
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
        <div className="figure figure-front">
          <FrontFigure className="figure-svg" aria-hidden="true" />
          <div className="region-layer">
            {bodyRegions
              .filter((region) => region.figure === 'front')
              .map((region) => (
                <RegionSwatch
                  key={region.id}
                  region={region}
                  load={regionLoads.get(region.id) ?? null}
                />
              ))}
          </div>
        </div>

        {otherMuscles.length > 0 && (
          <div className="other-muscles-column">
            <OtherMusclesPanel muscles={otherMuscles} />
          </div>
        )}

        <div className="figure figure-back">
          <BackFigure className="figure-svg" aria-hidden="true" />
          <div className="region-layer">
            {bodyRegions
              .filter((region) => region.figure === 'back')
              .map((region) => (
                <RegionSwatch
                  key={region.id}
                  region={region}
                  load={regionLoads.get(region.id) ?? null}
                />
              ))}
          </div>
        </div>
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
  const shapeClass = region.id === 'mental' ? 'region-mental' : ''
  const title = load
    ? `${region.label}: ACWR ${formatAcwr(load.load_score)} (${load.load_category})`
    : `${region.label}: no data`

  return (
    <div
      className={`muscle-region ${categoryClass} ${shapeClass}`}
      style={style}
      title={title}
    >
      <span className="region-label">{region.label}</span>
      {load ? (
        <span className="region-score">{formatAcwr(load.load_score)}</span>
      ) : (
        <span className="region-score region-score--empty">—</span>
      )}
    </div>
  )
}

const prioritizedOther = ['Lats', 'Adductors', 'Balance']
const prioritizedOtherSlugs = new Set(prioritizedOther.map(muscleSlug))

const OtherMusclesPanel = ({ muscles }: { muscles: MuscleLoad[] }) => {
  const bySlug = new Map<string, MuscleLoad>()

  muscles.forEach((muscle) => {
    const slug = muscleSlug(muscle.muscle_name)
    if (!bySlug.has(slug)) {
      bySlug.set(slug, muscle)
    }
  })

  const prioritizedMuscles: { name: string; muscle: MuscleLoad | null }[] = prioritizedOther.map(
    (name) => ({
      name,
      muscle: bySlug.get(muscleSlug(name)) ?? null,
    })
  )

  const remaining = Array.from(bySlug.entries())
    .filter(([slug]) => !prioritizedOtherSlugs.has(slug))
    .map(([, muscle]) => muscle)

  const displayList = [
    ...prioritizedMuscles,
    ...remaining.map((muscle) => ({ name: muscle.muscle_name, muscle })),
  ]

  if (displayList.length === 0) {
    return null
  }

  return (
    <div className="other-muscles-panel">
      <span className="region-label">Other muscles</span>
      <div className="other-muscles-list">
        {displayList.map(({ name, muscle }, index) => {
          const categoryClass = muscle ? loadCategoryToClass(muscle.load_category) : 'heat-white'
          const score = muscle ? formatAcwr(muscle.load_score) : '—'
          const title = muscle
            ? `${muscle.muscle_name}: ACWR ${score} (${muscle.load_category})`
            : `${name}: no data`

          return (
            <span key={`${name}-${index}`} className={`other-muscle-row ${categoryClass}`} title={title}>
              <span className="other-name">{name}</span>
              <span className={`other-score ${muscle ? '' : 'other-score--empty'}`}>{score}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

const Legend = () => (
  <div className="heat-legend">
    {loadDescriptions.map(({ category, label, helper }) => (
      <div key={category} className="legend-item">
        <span className={`legend-swatch heat-${category}`} />
        <div>
          <p className="legend-label">{label}</p>
          <p className="legend-sub">{helper}</p>
        </div>
      </div>
    ))}
  </div>
)

export default BodyHeatMap



