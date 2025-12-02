import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn('rb-input', className)} {...rest} />
)



