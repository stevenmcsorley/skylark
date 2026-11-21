interface SectionTabsProps {
  label: string
  sections: ReadonlyArray<{ id: string; label: string }>
  active: string
  onChange: (id: string) => void
}

/** Sub-pages of one page: plain text tabs on a ruled line, the active one underlined in ink. */
export const SectionTabs = ({ label, sections, active, onChange }: SectionTabsProps) => (
  <nav aria-label={label} className="mb-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-700" data-testid="section-tabs">
    {sections.map(s => (
      <button key={s.id} type="button" aria-current={s.id === active ? 'page' : undefined} onClick={() => onChange(s.id)} data-testid={`section-${s.id}`}
        className={`-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium focus-visible:outline-offset-[-2px] ${s.id === active ? 'border-slate-100 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-100'}`}>
        {s.label}
      </button>
    ))}
  </nav>
)
