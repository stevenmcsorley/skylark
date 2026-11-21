import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, Eye, EyeOff, Send } from 'lucide-react'
import { api } from '../utils/api.utils'
import { timeAgo } from '../utils/date.utils'
import { maskSecret } from '../utils/secret'
import type { Project } from '../types/app.types'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

export const buildDsn = (project: Project, origin: string = window.location.origin): string => {
  if (project.dsn) return project.dsn
  const url = new URL(origin)
  return `${url.protocol}//${project.ingest_token}@${url.host}/${project.id}`
}

/** Hide the key part of a DSN ("https://KEY@host/1"), keeping the first and last characters so it can still be told apart. */
export const maskDsn = (dsn: string): string => dsn.replace(/^([a-z]+:\/\/)([^@/]+)@/i, (_, scheme: string, key: string) => `${scheme}${maskSecret(key)}@`)

const TABS = ['Python', 'JavaScript', 'Node.js', 'HTTP'] as const
type Tab = typeof TABS[number]

export const snippet = (tab: Tab, dsn: string, project: Project, origin: string = window.location.origin): { install?: string; code: string } => {
  switch (tab) {
    case 'Python':
      return { install: 'pip install sentry-sdk', code: `import sentry_sdk\n\nsentry_sdk.init(\n    dsn="${dsn}",\n    environment="production",\n    release="1.0.0",\n)` }
    case 'JavaScript':
      return { install: 'npm install @sentry/browser', code: `import * as Sentry from "@sentry/browser";\n\nSentry.init({\n  dsn: "${dsn}",\n  environment: "production",\n  release: "1.0.0",\n});` }
    case 'Node.js':
      return { install: 'npm install @sentry/node', code: `const Sentry = require("@sentry/node");\n\nSentry.init({\n  dsn: "${dsn}",\n  environment: "production",\n  release: "1.0.0",\n});` }
    case 'HTTP':
      return { code: `curl -X POST ${origin}/api/events/ingest/token/${project.ingest_token}/ \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Something broke", "level": "error", "environment": "production"}'` }
  }
}

const iconButton = 'inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'

interface ConnectAppProps {
  project: Project
  /** How often to look for the first event while the panel is open. */
  pollMs?: number
}

export const ConnectApp = ({ project, pollMs = 3000 }: ConnectAppProps) => {
  const [tab, setTab] = useState<Tab>('Python')
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [latest, setLatest] = useState<string | null | undefined>(undefined)   // undefined = not checked yet, null = none
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copyTimer = useRef<number>()

  const dsn = buildDsn(project)
  const origin = window.location.origin
  const shown = (text: string) => revealed ? text : text.split(dsn).join(maskDsn(dsn)).split(project.ingest_token).join(maskSecret(project.ingest_token))

  useEffect(() => { setRevealed(false) }, [project.id])
  useEffect(() => {
    if (!revealed) return
    const t = window.setTimeout(() => setRevealed(false), 15000)
    return () => window.clearTimeout(t)
  }, [revealed])
  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const check = useCallback(async () => {
    try {
      const data = await api(`/api/events/?project=${encodeURIComponent(project.slug)}&limit=1`)
      const list = Array.isArray(data) ? data : data?.results ?? []
      setLatest(list[0]?.received_at ?? null)
    } catch { /* keep polling; the page shows its own errors */ }
  }, [project.slug])

  useEffect(() => {
    setLatest(undefined); check()
    const id = window.setInterval(check, pollMs)
    return () => window.clearInterval(id)
  }, [check, pollMs])

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key); window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(null), 1500)
    } catch { setError('Copy failed. Select the text and copy it manually.') }
  }

  const sendTest = async () => {
    setSending(true); setError(null)
    try {
      const res = await fetch(`/api/events/ingest/token/${project.ingest_token}/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Skylark test event', level: 'info', environment: 'test' }),
      })
      if (!res.ok) throw new Error(res.status === 429 ? 'Rate limited. Try again in a minute.' : `The server answered ${res.status}`)
      await check()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the test event')
    } finally {
      setSending(false)
    }
  }

  const active = snippet(tab, dsn, project, origin)
  const display = snippet(tab, shown(dsn), { ...project, ingest_token: shown(project.ingest_token) }, origin)

  return (
    <div className="space-y-5" data-testid="connect-app">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">DSN</span>
          <span className="flex items-center gap-1">
            <button type="button" className={iconButton} aria-pressed={revealed} aria-label={`${revealed ? 'Hide' : 'Reveal'} DSN`} onClick={() => setRevealed(r => !r)} data-testid="connect-reveal">
              <Icon icon={revealed ? EyeOff : Eye} size="sm" />
            </button>
            <button type="button" className={iconButton} aria-label="Copy DSN" onClick={() => copy('dsn', dsn)} data-testid="connect-copy-dsn">
              <Icon icon={copied === 'dsn' ? Check : Copy} size="sm" />
            </button>
          </span>
        </div>
        <code className="block overflow-x-auto whitespace-nowrap rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-200" data-testid="connect-dsn">{shown(dsn)}</code>
        <p className="text-[13px] text-slate-500">Paste this into any Sentry SDK. The key is hidden until you reveal it, and the copy buttons always copy the real value.</p>
      </div>

      <div className="space-y-2">
        <div role="tablist" aria-label="Language" className="inline-flex rounded-md border border-slate-700 p-0.5">
          {TABS.map(t => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} data-testid={`connect-tab-${t}`}
              className={`rounded px-3 py-1 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${tab === t ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>{t}</button>
          ))}
        </div>
        {active.install && (
          <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2">
            <code className="font-mono text-xs text-slate-300" data-testid="connect-install">{active.install}</code>
            <button type="button" className={iconButton} aria-label="Copy install command" onClick={() => copy('install', active.install!)}><Icon icon={copied === 'install' ? Check : Copy} size="sm" /></button>
          </div>
        )}
        <div className="relative rounded-md border border-slate-800 bg-slate-900/60">
          <button type="button" className={`${iconButton} absolute right-2 top-2`} aria-label="Copy code" onClick={() => copy('code', active.code)} data-testid="connect-copy-code">
            <Icon icon={copied === 'code' ? Check : Copy} size="sm" />
          </button>
          <pre className="overflow-x-auto p-4 pr-12 font-mono text-xs leading-5 text-slate-300" data-testid="connect-code">{display.code}</pre>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 px-4 py-3" data-testid="connect-status" role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-sm">
          {latest ? (
            <><Icon icon={Check} size="sm" className="text-accent-400" /><span className="text-slate-200">Connected. Last event {timeAgo(latest)}.</span></>
          ) : latest === null ? (
            <><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /><span className="text-slate-300">Waiting for the first event...</span></>
          ) : <span className="text-slate-500">Checking for events...</span>}
        </div>
        <Button size="sm" variant="secondary" loading={sending} icon={<Icon icon={Send} size="sm" />} onClick={sendTest} testId="connect-send-test">Send test event</Button>
      </div>
      {error && <p className="text-[13px] text-red-400" role="alert" data-testid="connect-error">{error}</p>}
    </div>
  )
}
