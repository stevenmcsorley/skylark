import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Bell } from 'lucide-react'
import { Icon, ICON_SIZES } from '../Icon'
import { EmptyState } from '../EmptyState'
import { LevelBadge } from '../../LevelBadge'

const SRC = join(__dirname, '../../../..')

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return ['__tests__', 'mocks', 'test'].includes(name) ? [] : sourceFiles(path)
    return /\.(tsx?|css)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })

describe('no emoji or pictograph characters in the UI source', () => {
  it('finds none', () => {
    // Text arrows, ellipses and dashes are fine; pictographs and the symbols that stood in for icons (check mark, cross, trigram) are not.
    const bad = /\p{Extended_Pictographic}|[✓✔✕✖☰]/u
    const hits = sourceFiles(SRC).filter(f => bad.test(readFileSync(f, 'utf8')))
    expect(hits).toEqual([])
  })
})

describe('Icon', () => {
  it('is hidden from assistive tech unless it has a label', () => {
    const { container, rerender } = render(<Icon icon={Bell} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    rerender(<Icon icon={Bell} aria-label="Alerts" />)
    expect(screen.getByRole('img', { name: 'Alerts' })).toBeInTheDocument()
  })

  it('uses one stroke weight and a fixed size scale', () => {
    const { container } = render(<><Icon icon={Bell} size="xs" /><Icon icon={Bell} size="lg" /></>)
    const svgs = [...container.querySelectorAll('svg')]
    expect(svgs.map(s => s.getAttribute('width'))).toEqual([String(ICON_SIZES.xs), String(ICON_SIZES.lg)])
    svgs.forEach(s => expect(s.getAttribute('stroke-width')).toBe('1.5'))
  })
})

describe('EmptyState', () => {
  it('shows a neutral icon, title, help and an action', () => {
    render(<EmptyState icon={Bell} title="No alert rules" description="Create one to get notified." action={<button>Create rule</button>} testId="empty" />)
    const box = screen.getByTestId('empty')
    expect(box.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('No alert rules')).toBeInTheDocument()
    expect(screen.getByText('Create one to get notified.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create rule' })).toBeInTheDocument()
  })
})

describe('LevelBadge', () => {
  it.each(['fatal', 'error', 'warning', 'info', 'debug'])('renders a dot and the word for %s', level => {
    render(<LevelBadge level={level} />)
    expect(screen.getByTestId('level-badge-indicator')).toHaveClass('rounded-full')
    expect(screen.getByText(level)).toBeInTheDocument()
  })
})
