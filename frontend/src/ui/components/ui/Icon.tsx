import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

/** The one way to draw an icon in Skylark: monochrome (inherits the text colour), one stroke weight, a fixed size scale. */
export const ICON_SIZES = { xs: 14, sm: 16, md: 20, lg: 24 } as const
export type IconSize = keyof typeof ICON_SIZES
export type IconComponent = ComponentType<LucideProps>

interface IconProps {
  icon: IconComponent
  size?: IconSize
  /** Give an icon a label only when it carries meaning on its own; decorative icons stay hidden from screen readers. */
  'aria-label'?: string
  className?: string
}

export const Icon = ({ icon: Glyph, size = 'md', 'aria-label': label, className }: IconProps) => (
  <Glyph
    size={ICON_SIZES[size]}
    strokeWidth={1.5}
    className={['shrink-0', className].filter(Boolean).join(' ')}
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
  />
)
