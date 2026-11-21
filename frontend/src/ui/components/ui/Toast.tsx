import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import { Icon } from './Icon'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts(prev => [...prev, { id, type, message, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

const ToastContainer = () => {
  const { toasts } = useToast()

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-accent-500/10',
    border: 'border-accent-500/30',
    icon: 'text-accent-400'
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400'
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400'
  },
  info: {
    bg: 'bg-accent-500/10',
    border: 'border-slate-700',
    icon: 'text-accent-400'
  }
}

const toastIcons: Record<ToastType, ReactNode> = {
  success: <Icon icon={CircleCheck} size="md" />,
  error: <Icon icon={CircleX} size="md" />,
  warning: <Icon icon={TriangleAlert} size="md" />,
  info: <Icon icon={Info} size="md" />
}

const ToastItem = ({ toast }: { toast: Toast }) => {
  const { removeToast } = useToast()
  const [isExiting, setIsExiting] = useState(false)
  const styles = toastStyles[toast.type]

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        setIsExiting(true)
        setTimeout(() => removeToast(toast.id), 200)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast, removeToast])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => removeToast(toast.id), 200)
  }

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border 
         min-w-[300px] max-w-[400px]
        ${styles.bg} ${styles.border}
        transform transition-all duration-200
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="alert"
    >
      <span className={styles.icon}>
        {toastIcons[toast.type]}
      </span>
      <p className="flex-1 text-sm text-slate-200">{toast.message}</p>
      <button
        onClick={handleClose}
        className="text-slate-400 hover:text-white transition-colors"
        aria-label="Close notification"
      >
        <Icon icon={X} size="sm" />
      </button>
    </div>
  )
}
