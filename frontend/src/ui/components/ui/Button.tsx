import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Icon } from './Icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  testId?: string
}

const variants = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500',
  secondary: 'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 focus:ring-accent-500',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus:ring-accent-500',
  danger: 'border border-red-500/40 bg-transparent text-red-400 hover:bg-red-500/10 focus:ring-red-500',
  // legacy names, kept so existing callers keep working: success reads as primary, warning as secondary
  success: 'bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500',
  warning: 'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 focus:ring-accent-500',
}

const sizes = {
  xs: 'h-6 px-2 text-xs',
  sm: 'h-7 px-3 text-sm',
  md: 'h-8 px-3.5 text-sm',
  lg: 'h-10 px-5 text-sm'
}

const disabledStyles = 'cursor-not-allowed border border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800/60'

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  className = '',
  testId,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-md font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
        ${isDisabled ? disabledStyles : variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={isDisabled}
      data-testid={testId}
      {...props}
    >
      {loading ? (
        <Icon icon={LoaderCircle} size="sm" className="animate-spin" />
      ) : icon ? (
        <span className="h-4 w-4">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  label: string
  testId?: string
}

const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12'
}

export const IconButton = ({
  icon,
  variant = 'ghost',
  size = 'md',
  label,
  disabled,
  className = '',
  testId,
  ...props
}: IconButtonProps) => (
  <button
    className={`
      inline-flex items-center justify-center rounded-lg
      transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
      ${disabled ? disabledStyles : variants[variant]}
      ${iconSizes[size]}
      ${className}
    `}
    disabled={disabled}
    aria-label={label}
    title={label}
    data-testid={testId}
    {...props}
  >
    {icon}
  </button>
)
