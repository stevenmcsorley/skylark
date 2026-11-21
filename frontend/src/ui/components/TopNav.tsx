import { NAV_ITEMS } from '../navigation'
import type { NavigationTab } from '../navigation'
import { WorkspaceMenu } from '../auth/WorkspaceMenu'

interface TopNavProps {
  activeTab: NavigationTab
  onChange: (tab: NavigationTab) => void
  /** Open issues across every app; shown on Inbox in the signal colour. */
  inboxCount?: number
}

export const TopNav = ({ activeTab, onChange, inboxCount = 0 }: TopNavProps) => (
  <header className="border-b border-slate-700 bg-slate-950" data-testid="top-nav">
    <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-1 px-4 sm:px-6">
      <a href="#view=inbox" onClick={e => { e.preventDefault(); onChange('inbox') }} className="flex items-center gap-2 py-3 text-base font-semibold tracking-tight text-slate-100" aria-label="Skylark, go to Inbox">
        <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
          <path d="M5 24 C 11 22, 16 16, 22 9" fill="none" stroke="#17191a" strokeWidth="3" strokeLinecap="round" />
          <circle cx="24.5" cy="7.5" r="3.2" fill="#d63a20" />
        </svg>
        Skylark
      </a>
      <nav aria-label="Primary" className="order-last -mb-px flex w-full gap-1 overflow-x-auto overflow-y-hidden sm:order-none sm:w-auto sm:flex-1">
        {NAV_ITEMS.map(item => {
          const active = item.id === activeTab
          return (
            <a
              key={item.id}
              href={`#view=${item.id}`}
              aria-current={active ? 'page' : undefined}
              title={item.purpose}
              onClick={e => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); onChange(item.id) } }}
              data-testid={`nav-${item.id}`}
              className={`relative inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-medium focus-visible:outline-offset-[-2px] ${active ? 'border-slate-100 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-100'}`}
            >
              {item.label}
              {item.id === 'inbox' && inboxCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold tabular-nums text-white" aria-label={`${inboxCount} open`}>{inboxCount}</span>
              )}
            </a>
          )
        })}
      </nav>
      <div className="ml-auto py-2"><WorkspaceMenu /></div>
    </div>
  </header>
)
