interface LevelBadgeProps {
  level: string
  variant?: 'default' | 'compact'
  testId?: string
  className?: string
}

/** One semantic colour per level, shown as a small solid dot (never an emoji, never a filled pill). */
const DOTS: Record<string, string> = {
  fatal: 'bg-red-600',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  debug: 'bg-slate-500',
}

export const LevelBadge = ({ level, variant = 'default', testId = 'level-badge', className = '' }: LevelBadgeProps) => {
  const key = level.toLowerCase()
  const dot = DOTS[key] ?? 'bg-sky-500'

  if (variant === 'compact') {
    return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} title={level} data-testid={`${testId}-dot`} />
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-slate-300 ${className}`} data-testid={testId}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} data-testid={`${testId}-indicator`} />
      <span className={`capitalize ${key === 'fatal' ? 'font-semibold text-slate-100' : ''}`}>{level}</span>
    </span>
  )
}
