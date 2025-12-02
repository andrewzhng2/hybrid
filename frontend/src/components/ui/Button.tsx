import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = ({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  ...rest
}: ButtonProps) => (
  <button
    className={cn('rb-button', `rb-button--${variant}`, `rb-button--${size}`, className)}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? 'Working...' : children}
  </button>
)



