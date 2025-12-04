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
    id: 'shoulders-front',
    label: 'Shoulders',
    figure: 'front',
    bounds: { top: pct(19), left: pct(20), width: pct(60), height: pct(6) },
    aliases: ['shoulders', 'shoulder', 'delts', 'deltoids'],
  },
  {
    id: 'chest',
    label: 'Chest',
    figure: 'front',
    bounds: { top: pct(25), left: pct(33), width: pct(34), height: pct(11) },
    aliases: ['chest', 'pecs', 'pectorals'],
  },
  {
    id: 'core',
    label: 'Core',
    figure: 'front',
    bounds: { top: pct(36), left: pct(35), width: pct(30), height: pct(12) },
    aliases: ['core', 'abs', 'abdominals'],
  },
  {
    id: 'hip-flexors',
    label: 'Hip flexors',
    figure: 'front',
    bounds: { top: pct(48), left: pct(35), width: pct(30), height: pct(10) },
    aliases: ['hips', 'hip flexors', 'hip-flexors'],
  },
  {
    id: 'quads',
    label: 'Quads',
    figure: 'front',
    bounds: { top: pct(58), left: pct(32), width: pct(36), height: pct(16) },
    aliases: ['quads', 'quadriceps', 'thighs'],
  },
  {
    id: 'balance',
    label: 'Balance',
    figure: 'front',
    bounds: { top: pct(91), left: pct(34), width: pct(32), height: pct(8) },
    aliases: ['balance', 'feet', 'footwork', 'stability'],
  },
  {
    id: 'upper-back',
    label: 'Upper back',
    figure: 'back',
    bounds: { top: pct(19), left: pct(20), width: pct(60), height: pct(6) },
    aliases: ['upper back', 'upper-back', 'lats', 'latissimus'],
  },
  {
    id: 'lower-back',
    label: 'Lower back',
    figure: 'back',
    bounds: { top: pct(34), left: pct(35), width: pct(30), height: pct(11) },
    aliases: ['lower back', 'lower-back', 'erectors'],
  },
  {
    id: 'glutes',
    label: 'Glutes',
    figure: 'back',
    bounds: { top: pct(46), left: pct(36), width: pct(28), height: pct(10) },
    aliases: ['glutes', 'glute', 'gluteus', 'butt'],
  },
  {
    id: 'hamstrings',
    label: 'Hamstrings',
    figure: 'back',
    bounds: { top: pct(56), left: pct(33), width: pct(34), height: pct(16) },
    aliases: ['hamstrings', 'hamstring', 'hams'],
  },
  {
    id: 'calves-back',
    label: 'Calves',
    figure: 'back',
    bounds: { top: pct(77), left: pct(35), width: pct(30), height: pct(14) },
    aliases: ['calves', 'calf', 'gastroc', 'soleus', 'shins'],
  },
  {
    id: 'mental',
    label: 'Mental',
    figure: 'back',
    bounds: { top: pct(5), left: pct(33), width: pct(34), height: pct(8) },
    aliases: ['mental', 'mind', 'headspace', 'brain', 'head'],
  },
  {
    id: 'biceps',
    label: 'Biceps',
    figure: 'front',
    bounds: { top: pct(25), left: pct(6), width: pct(20), height: pct(18) },
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

