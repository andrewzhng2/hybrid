import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export const Card = ({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rb-card', className)} {...rest}>
    {children}
  </div>
)


