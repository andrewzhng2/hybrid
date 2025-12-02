import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export const Select = ({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn('rb-select', className)} {...rest}>
    {children}
  </select>
)



