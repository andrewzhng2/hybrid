import { useOutletContext } from 'react-router-dom'

import { BackFigure, FrontFigure } from '@/assets/body'
import { useMuscleLoad } from '@/api/hooks'
import type { AthleteProfile, LoadCategory, MuscleLoad } from '@/api/types'
import { Badge, Card } from '@/components/ui'
import type { WeekContextValue } from '@/types/week'
import { formatWeekRange } from '@/utils/date'
import {
  bodyRegions,
  findRegionsForMuscle,
  loadCategoryToClass,
  type BodyRegion,
} from './bodyRegions'

type LegendDescription = {
  category: LoadCategory
  label: string
  helper: string
}

type HeatmapVariant = 'acwr' | 'fatigue'

const loadDescriptions: LegendDescription[] = [
  { category: 'white', label: 'No data', helper: 'Nothing logged' },
  { category: 'blue', label: 'Under-used', helper: 'ACWR below target' },
  { category: 'green', label: 'In the zone', helper: 'ACWR on target' },
  { category: 'yellow', label: 'Building', helper: 'ACWR slightly elevated' },
  { category: 'orange', label: 'Pushing', helper: 'ACWR high' },
  { category: 'red', label: 'Overworked', helper: 'ACWR very high' },
]

const fatigueDescriptions: LegendDescription[] = [
  { category: 'white', label: 'No data', helper: 'No recorded minutes' },
  { category: 'blue', label: 'Fresh', helper: 'Light activation this week' },
  { category: 'green', label: 'Working', helper: 'Solid training stimulus' },
  { category: 'yellow', label: 'Fatigue building', helper: 'Noticeable wear, plan recovery' },
  { category: 'orange', label: 'Taxed', helper: 'High structural load' },
  { category: 'red', label: 'Cooked', helper: 'Deload before next block' },
]

const formatAcwr = (value: number) => value.toFixed(2)

const formatFatigue = (value: number) => {
  if (value <= 0) {
    return '0.0'
  }
  if (value >= 100) {
    return Math.round(value).toString()
  }
  return value.toFixed(1)
}

const heatmapConfigs: Record<
  HeatmapVariant,
  {
    title: string
    helper: string
    descriptions: LegendDescription[]
    scoreLabel: string
    formatScore: (value: number) => string
  }
> = {
  acwr: {
    title: 'Muscle load health',
    helper: 'ACWR · Acute vs chronic signal',
    descriptions: loadDescriptions,
    scoreLabel: 'ACWR',
    formatScore: formatAcwr,
  },
  fatigue: {
    title: 'Overall activity load',
    helper: 'Linear fatigue · Duration × muscle weight × RPE/6',
    descriptions: fatigueDescriptions,
    scoreLabel: 'Fatigue load',
    formatScore: formatFatigue,
  },
}

const formatDecimal = (value: number) => (Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1))

const formatWeight = (weightKg?: number | null) => {
  if (weightKg == null) {
    return '—'
  }
  const pounds = Math.round(weightKg * 2.20462)
  return `${formatDecimal(weightKg)} kg (${pounds} lb)`
}

const formatHeight = (heightCm?: number | null) => {
  if (heightCm == null) {
    return '—'
  }
  const totalInches = heightCm / 2.54
  let feet = Math.floor(totalInches / 12)
  let inches = Math.round(totalInches - feet * 12)
  if (inches === 12) {
    feet += 1
    inches = 0
  }
  return `${formatDecimal(heightCm)} cm (${feet}'${inches}")`
}

const formatAge = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) {
    return '—'
  }
  const birthDate = new Date(dateOfBirth)
  if (Number.isNaN(birthDate.getTime())) {
    return '—'
  }
  const today = new Date()
  let years = today.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) {
    years -= 1
  }
  return years >= 0 ? `${years} yrs` : '—'
}

const getVariantMetrics = (muscle: MuscleLoad, variant: HeatmapVariant) => {
  if (variant === 'acwr') {
    return {
      score: muscle.load_score,
      category: muscle.load_category,
      formatted: heatmapConfigs.acwr.formatScore(muscle.load_score),
      label: heatmapConfigs.acwr.scoreLabel,
    }
  }

  return {
    score: muscle.fatigue_score,
    category: muscle.fatigue_category,
    formatted: heatmapConfigs.fatigue.formatScore(muscle.fatigue_score),
    label: heatmapConfigs.fatigue.scoreLabel,
  }
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
            <h2>Muscle Load (ACWR) · {formatWeekRange(weekStart)}</h2>
          </div>
          <Badge tone="warning">Experimental</Badge>
        </header>

        {isLoading || !data ? (
          <p>Loading muscle data...</p>
        ) : (
          <>
            <AthleteVitalsRow profile={data.athlete_profile} />
            <HeatmapSection muscles={data.muscles} variant="acwr" />
            <HeatmapSection muscles={data.muscles} variant="fatigue" />
          </>
        )}
      </Card>
    </section>
  )
}

const AthleteVitalsRow = ({ profile }: { profile: AthleteProfile | null | undefined }) => {
  const metrics = [
    { label: 'Weight', value: formatWeight(profile?.weight_kg) },
    { label: 'Height', value: formatHeight(profile?.height_cm) },
    { label: 'Age', value: formatAge(profile?.date_of_birth) },
  ]

  return (
    <div className="stats-row vitals-row">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <p className="stat-label">{metric.label}</p>
          <p className="stat-value">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}

const HeatmapSection = ({ muscles, variant }: { muscles: MuscleLoad[]; variant: HeatmapVariant }) => {
  const config = heatmapConfigs[variant]
  return (
    <section className="heatmap-section">
      <header className="heatmap-section__header">
        <div>
          <p className="eyebrow">{config.title}</p>
          <p className="helper-text">{config.helper}</p>
        </div>
      </header>
      <div className="heatmap-wrapper">
        <BodyOverlay muscles={muscles} variant={variant} />
      </div>
      <Legend descriptions={config.descriptions} />
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

const BodyOverlay = ({ muscles, variant }: { muscles: MuscleLoad[]; variant: HeatmapVariant }) => {
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
                  variant={variant}
                />
              ))}
          </div>
        </div>

        {otherMuscles.length > 0 && (
          <div className="other-muscles-column">
            <OtherMusclesPanel muscles={otherMuscles} variant={variant} />
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
                  variant={variant}
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
  variant,
}: {
  region: BodyRegion
  load: MuscleLoad | null
  variant: HeatmapVariant
}) => {
  const style = {
    top: `${region.bounds.top}%`,
    left: `${region.bounds.left}%`,
    width: `${region.bounds.width}%`,
    height: `${region.bounds.height}%`,
  }

  const metrics = load ? getVariantMetrics(load, variant) : null
  const categoryClass = metrics ? loadCategoryToClass(metrics.category) : 'heat-white'
  const shapeClass = region.id === 'mental' ? 'region-mental' : ''
  const title = metrics
    ? `${region.label}: ${metrics.label} ${metrics.formatted} (${metrics.category})`
    : `${region.label}: no data`
  const showScore = Boolean(metrics && metrics.score > 0)
  const displayValue = showScore && metrics ? metrics.formatted : '—'
  const scoreClass = showScore ? '' : 'region-score--empty'

  return (
    <div
      className={`muscle-region ${categoryClass} ${shapeClass}`}
      style={style}
      title={title}
    >
      <span className="region-label">{region.label}</span>
      <span className={`region-score ${scoreClass}`}>{displayValue}</span>
    </div>
  )
}

const prioritizedOther = ['Lats', 'Adductors', 'Balance']
const prioritizedOtherSlugs = new Set(prioritizedOther.map(muscleSlug))

const OtherMusclesPanel = ({ muscles, variant }: { muscles: MuscleLoad[]; variant: HeatmapVariant }) => {
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
          const metrics = muscle ? getVariantMetrics(muscle, variant) : null
          const categoryClass = metrics ? loadCategoryToClass(metrics.category) : 'heat-white'
          const hasScore = Boolean(metrics && metrics.score > 0)
          const score = hasScore && metrics ? metrics.formatted : '—'
          const title = metrics
            ? `${muscle?.muscle_name ?? name}: ${metrics.label} ${metrics.formatted} (${metrics.category})`
            : `${name}: no data`

          return (
            <span key={`${name}-${index}`} className={`other-muscle-row ${categoryClass}`} title={title}>
              <span className="other-name">{name}</span>
              <span className={`other-score ${hasScore ? '' : 'other-score--empty'}`}>{score}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

const Legend = ({ descriptions }: { descriptions: LegendDescription[] }) => (
  <div className="heat-legend">
    {descriptions.map(({ category, label, helper }) => (
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



