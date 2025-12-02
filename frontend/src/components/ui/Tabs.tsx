import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

interface Tab {
  id: string
  label: string
}

interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: Tab[]
  activeTab: string
  onValueChange: (id: string) => void
}

export const Tabs = ({ tabs, activeTab, onValueChange, className, ...rest }: TabsProps) => (
  <div className={cn('rb-tabs', className)} {...rest}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={cn('rb-tab', tab.id === activeTab && 'rb-tab--active')}
        onClick={() => onValueChange(tab.id)}
        type="button"
      >
        {tab.label}
      </button>
    ))}
  </div>
)


