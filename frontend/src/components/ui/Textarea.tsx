import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export const Textarea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn('rb-textarea', className)} {...rest} />
)



