import type { LoadCategory, MuscleLoad } from '@/api/types'

export type FigureSide = 'front' | 'back'

export interface BodyRegionBounds {
  top: number
  left: number
  width: number
  height: number
}

export interface BodyRegion {
  id: string
  label: string
  figure: FigureSide
  bounds: BodyRegionBounds
  aliases: string[]
}

const pct = (value: number) => Number(value.toFixed(2))

export const bodyRegions: BodyRegion[] = [
  {
    id: 'shoulders-front-left',
    label: 'Shoulders',
    figure: 'front',
    bounds: { top: pct(20), left: pct(3), width: pct(27), height: pct(7.5) },
    aliases: ['shoulders', 'shoulder', 'delts', 'deltoids'],
  },
  {
    id: 'shoulders-front-right',
    label: 'Shoulders',
    figure: 'front',
    bounds: { top: pct(20), left: pct(70.5), width: pct(27), height: pct(7.5) },
    aliases: ['shoulders', 'shoulder', 'delts', 'deltoids'],
  },
  {
    id: 'chest',
    label: 'Chest',
    figure: 'front',
    bounds: { top: pct(20), left: pct(31), width: pct(38), height: pct(11) },
    aliases: ['chest', 'pecs', 'pectorals'],
  },
  {
    id: 'core',
    label: 'Core',
    figure: 'front',
    bounds: { top: pct(32), left: pct(35), width: pct(30), height: pct(17) },
    aliases: ['core', 'abs', 'abdominals'],
  },
  {
    id: 'hip-flexors',
    label: 'Hip Flexors',
    figure: 'front',
    bounds: { top: pct(50), left: pct(35), width: pct(30), height: pct(10) },
    aliases: ['hips', 'hip flexors', 'hip-flexors'],
  },
  {
    id: 'quads-left',
    label: 'Quads',
    figure: 'front',
    bounds: { top: pct(63), left: pct(24.5), width: pct(18), height: pct(16) },
    aliases: ['quads', 'quadriceps', 'thighs'],
  },
  {
    id: 'quads-right',
    label: 'Quads',
    figure: 'front',
    bounds: { top: pct(63), left: pct(57.5), width: pct(18), height: pct(16) },
    aliases: ['quads', 'quadriceps', 'thighs'],
  },
  {
    id: 'upper-back',
    label: 'Upper Back',
    figure: 'back',
    bounds: { top: pct(20), left: pct(31), width: pct(38), height: pct(16) },
    aliases: ['upper back', 'upper-back', 'lats', 'latissimus'],
  },
  {
    id: 'lower-back',
    label: 'Lower Back',
    figure: 'back',
    bounds: { top: pct(37), left: pct(31), width: pct(38), height: pct(14) },
    aliases: ['lower back', 'lower-back', 'erectors'],
  },
  {
    id: 'glutes',
    label: 'Glutes',
    figure: 'back',
    bounds: { top: pct(52), left: pct(33), width: pct(34), height: pct(9) },
    aliases: ['glutes', 'glute', 'gluteus', 'butt'],
  },
  {
    id: 'hamstrings-left',
    label: 'Hamstrings',
    figure: 'back',
    bounds: { top: pct(63), left: pct(24.5), width: pct(18), height: pct(16) },
    aliases: ['hamstrings', 'hamstring', 'hams'],
  },
  {
    id: 'hamstrings-right',
    label: 'Hamstrings',
    figure: 'back',
    bounds: { top: pct(63), left: pct(57.5), width: pct(18), height: pct(16) },
    aliases: ['hamstrings', 'hamstring', 'hams'],
  },
  {
    id: 'calves-back-left',
    label: 'Calves',
    figure: 'back',
    bounds: { top: pct(80), left: pct(26.5), width: pct(14), height: pct(10) },
    aliases: ['calves', 'calf', 'gastroc', 'soleus', 'shins'],
  },
  {
    id: 'calves-back-right',
    label: 'Calves',
    figure: 'back',
    bounds: { top: pct(80), left: pct(60), width: pct(14), height: pct(10) },
    aliases: ['calves', 'calf', 'gastroc', 'soleus', 'shins'],
  },
  {
    id: 'mental',
    label: 'Mental',
    figure: 'back',
    bounds: { top: pct(3), left: pct(34.3), width: pct(32), height: pct(5) },
    aliases: ['mental', 'mind', 'headspace', 'brain', 'head'],
  },
  {
    id: 'biceps',
    label: 'Biceps',
    figure: 'front',
    bounds: { top: pct(28), left: pct(6), width: pct(20), height: pct(18) },
    aliases: ['biceps', 'arms', 'upper arms'],
  },
  {
    id: 'tendons',
    label: 'Tendons',
    figure: 'front',
    bounds: { top: pct(50), left: pct(7.5), width: pct(18), height: pct(10) },
    aliases: ['tendons', 'hands', 'grip', 'wrists'],
  },
  {
    id: 'triceps',
    label: 'Triceps',
    figure: 'back',
    bounds: { top: pct(25), left: pct(6), width: pct(20), height: pct(18) },
    aliases: ['triceps', 'upper arms (rear)'],
  },
  {
    id: 'forearms-back',
    label: 'Forearms',
    figure: 'back',
    bounds: { top: pct(44), left: pct(6.5), width: pct(20), height: pct(14) },
    aliases: ['forearms', 'forearm'],
  },
]

const normalize = (value: string) => value.trim().toLowerCase()
const strip = (value: string) => normalize(value).replace(/[^a-z]/g, '')

const matchesAlias = (alias: string, target: string) => {
  const normalizedAlias = normalize(alias)
  if (!normalizedAlias) {
    return false
  }

  if (normalizedAlias === target) {
    return true
  }

  return strip(target).includes(strip(alias))
}

export const findRegionsForMuscle = (muscle: MuscleLoad): BodyRegion[] => {
  const name = normalize(muscle.muscle_name)
  return bodyRegions.filter((region) =>
    region.aliases.some((alias) => matchesAlias(alias, name))
  )
}

export const loadCategoryToClass = (category: LoadCategory) => `heat-${category}`

