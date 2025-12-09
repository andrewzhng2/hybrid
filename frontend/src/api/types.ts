export interface Activity {
  activity_id: number
  week_id: number
  sport_id: number
  date: string
  category?: string | null
  duration_minutes: number
  intensity_rpe: number
  notes?: string | null
}

export interface ActivityCreate {
  sport_id: number
  date: string
  category?: string
  duration_minutes: number
  intensity_rpe: number
  notes?: string
}

export type ActivityUpdate = ActivityCreate

export interface SportBreakdown {
  sport_id: number
  sport_name: string
  total_duration_minutes: number
  session_count: number
}

export interface WeekStats {
  total_duration_minutes: number
  session_count: number
  average_rpe: number
  sport_breakdown: SportBreakdown[]
}

export interface WeekSummary {
  week_start_date: string
  week_end_date: string
  label?: string | null
  stats: WeekStats
  activities: Activity[]
}

export type LoadCategory = 'white' | 'blue' | 'green' | 'yellow' | 'orange' | 'red'

export interface MuscleLoad {
  muscle_id: number
  muscle_name: string
  load_score: number
  load_category: LoadCategory
  fatigue_score: number
  fatigue_category: LoadCategory
}

export interface AthleteProfile {
  height_cm?: number | null
  weight_kg?: number | null
  date_of_birth?: string | null
}

export interface MuscleLoadResponse {
  week_start_date: string
  week_end_date: string
  muscles: MuscleLoad[]
  athlete_profile?: AthleteProfile | null
}

export interface SportFocus {
  focus_id: number
  sport_id: number
  name: string
}

export interface Sport {
  sport_id: number
  name: string
  default_intensity_scale?: number | null
  focuses: SportFocus[]
}



