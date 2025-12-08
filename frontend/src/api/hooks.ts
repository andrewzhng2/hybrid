import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from './client'
import type { ActivityCreate } from './types'

export const useWeekSummary = (weekStart: string) =>
  useQuery({
    queryKey: ['week', weekStart],
    queryFn: () => api.getWeekSummary(weekStart),
    enabled: Boolean(weekStart),
    staleTime: 1000 * 60,
  })

export const useMuscleLoad = (weekStart: string) =>
  useQuery({
    queryKey: ['muscle-load', weekStart],
    queryFn: () => api.getMuscleLoad(weekStart),
    enabled: Boolean(weekStart),
    staleTime: 1000 * 60,
  })

export const useSports = () =>
  useQuery({
    queryKey: ['sports'],
    queryFn: () => api.getSports(),
    staleTime: 1000 * 60 * 5,
  })

export const useCreateActivity = (weekStart: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ActivityCreate) => api.createActivity(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['week', weekStart] })
      await queryClient.invalidateQueries({ queryKey: ['muscle-load', weekStart] })
    },
  })
}



