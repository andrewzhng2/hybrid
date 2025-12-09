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

export const usePeriodSummary = (params: { start_date?: string; end_date?: string; lifetime?: boolean }) =>
  useQuery({
    queryKey: ['summary', params.start_date, params.end_date, params.lifetime],
    queryFn: () => api.getPeriodSummary(params),
    enabled: Boolean(params.lifetime || (params.start_date && params.end_date)),
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

export const useUpdateActivity = (weekStart: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ activityId, payload }: { activityId: number; payload: ActivityCreate }) =>
      api.updateActivity(activityId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['week', weekStart] })
      await queryClient.invalidateQueries({ queryKey: ['muscle-load', weekStart] })
    },
  })
}

export const useDeleteActivity = (weekStart: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (activityId: number) => api.deleteActivity(activityId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['week', weekStart] })
      await queryClient.invalidateQueries({ queryKey: ['muscle-load', weekStart] })
    },
  })
}



