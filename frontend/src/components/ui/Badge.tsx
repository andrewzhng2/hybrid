import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'success' | 'warning' | 'info'
}

export const Badge = ({ className, tone = 'default', ...rest }: BadgeProps) => (
  <span className={cn('rb-badge', `rb-badge--${tone}`, className)} {...rest} />
)



