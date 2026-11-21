import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { Icon } from './ui/Icon'
import { maskSecret } from '../utils/secret'

interface SecretValueProps {
  value: string
  label: string
  display?: (revealed: boolean) => string
}

const buttonStyle = 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-accent-400 max-md:h-11 max-md:w-11'

const copyWithTextarea = (value: string) => {
  const previousFocus = document.activeElement
  const field = document.createElement('textarea')
  field.className = 'sr-only'
  field.value = value
  document.body.appendChild(field)
  try {
    field.select()
    return document.execCommand('copy')
  } finally {
    field.remove()
    if (previousFocus instanceof HTMLElement) previousFocus.focus()
  }
}

const SecretControls = ({ value, label, display }: SecretValueProps) => {
  const [revealed, setRevealed] = useState(false)
  const [status, setStatus] = useState('')
  const statusTimer = useRef<number>()
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(statusTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!revealed) return
    const timer = window.setTimeout(() => setRevealed(false), 15000)
    return () => window.clearTimeout(timer)
  }, [revealed])

  const copy = async () => {
    let success = true
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value)
      else success = copyWithTextarea(value)
    } catch {
      success = false
    }
    if (!mounted.current) return
    setStatus(success ? 'Copied' : 'Copy failed')
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(''), 2000)
  }

  return (
    <span data-testid="secret-value" className="inline-flex flex-nowrap items-center gap-1">
      <code className={`min-w-0 break-all whitespace-pre-wrap font-mono text-xs ${revealed ? 'select-text' : 'select-none'}`}>
        {display ? display(revealed) : revealed ? value : maskSecret(value)}
      </code>
      <button type="button" className={buttonStyle} data-testid="secret-reveal" aria-pressed={revealed}
        aria-label={`${revealed ? 'Hide' : 'Reveal'} ${label}`} onClick={() => setRevealed(!revealed)}>
        <Icon icon={revealed ? EyeOff : Eye} size="sm" />
      </button>
      <button type="button" className={buttonStyle} data-testid="secret-copy" aria-label={`Copy ${label}`} onClick={copy}>
        <Icon icon={status === 'Copied' ? Check : Copy} size="sm" />
      </button>
      <span role="status" aria-live="polite" className="text-xs">{status}</span>
    </span>
  )
}

// Changing projects or rotating a token starts a fresh, masked disclosure.
export const SecretValue = (props: SecretValueProps) => <SecretControls key={props.value} {...props} />
