import { Fragment, useEffect, useRef, useState } from 'react'
import { NAV_ITEMS, type NavigationTab } from '../navigation'

interface NavRailProps {
  activeTab: NavigationTab
  onChange: (tab: NavigationTab) => void
  className?: string
  testId?: string
}

const collapseKey = 'skylark-nav-collapsed'
const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400'

export const NavRail = ({ activeTab, onChange, className = '', testId = 'nav-rail' }: NavRailProps) => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(collapseKey) === 'true' } catch { return false }
  })
  const [open, setOpen] = useState(false)
  const menu = useRef<HTMLButtonElement>(null)
  const rail = useRef<HTMLElement>(null)
  const compact = collapsed && !open

  const close = () => {
    setOpen(false)
    menu.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const links = rail.current?.querySelectorAll('a')
    if (!links?.length) return
    links[0].focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key !== 'Tab') return
      const first = links[0]
      const last = links[links.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const onResize = () => { if (window.innerWidth >= 1024) setOpen(false) }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return <>
    <div className="flex items-center gap-3 rounded-lg bg-slate-800 p-2 lg:hidden">
      <button ref={menu} type="button" aria-label="Open navigation" aria-controls="main-nav" aria-expanded={open}
        className={`rounded px-3 py-2 ${focusRing}`} onClick={() => setOpen(true)}>☰</button>
      <span className="font-semibold">Skylark</span>
    </div>
    {open && <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={close} />}
    <nav id="main-nav" ref={rail} data-testid={testId} aria-label="Main navigation"
      className={`fixed inset-y-0 left-0 z-50 flex w-56 max-w-full flex-col overflow-y-auto border border-slate-700 bg-slate-900 p-2 text-slate-200 transition-transform motion-reduce:transition-none lg:sticky lg:top-4 lg:z-auto lg:h-[calc(100dvh-2rem)] lg:shrink-0 lg:translate-x-0 lg:visible lg:rounded-xl ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'} ${compact ? 'lg:w-14' : 'lg:w-56'} ${className}`}>
      <div className="mb-2 flex items-center gap-3 font-semibold" data-testid="nav-logo" title="Skylark">
        <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0 rounded-lg bg-emerald-600 p-1 text-white" fill="currentColor" aria-hidden="true">
          <path d="M5 20 C 10.5 12.5, 14 13, 16 17.5 C 18 13, 21.5 12.5, 27 20 C 21.5 17, 18.2 18, 16 22 C 13.8 18, 10.5 17, 5 20 Z" />
        </svg>
        {!compact && 'Skylark'}
      </div>
      {NAV_ITEMS.map(({ id, label, description, icon: Icon, group }, index) => (
        <Fragment key={id}>
          {!compact && group && group !== NAV_ITEMS[index - 1]?.group &&
            <h2 className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{group}</h2>}
          <a href={`#view=${id}`} data-testid={`nav-${id}`} aria-label={label}
            aria-current={activeTab === id ? 'page' : undefined} title={compact ? label : description}
            className={`flex shrink-0 items-center gap-3 rounded-lg p-2 text-sm ${focusRing} ${activeTab === id ? 'bg-blue-900 text-white' : 'hover:bg-slate-800'}`}
            onClick={event => {
              if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onChange(id)
              if (open) close()
            }}>
            <Icon />{!compact && label}
          </a>
        </Fragment>
      ))}
      <button type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`mt-auto hidden rounded-lg p-2 text-sm lg:block ${focusRing}`}
        onClick={() => {
          setCollapsed(!collapsed)
          try { localStorage.setItem(collapseKey, String(!collapsed)) } catch { /* Storage unavailable */ }
        }}>{collapsed ? '»' : '« Collapse sidebar'}</button>
    </nav>
  </>
}
