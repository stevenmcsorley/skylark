import { render, screen } from '@testing-library/react'
import { LevelBadge } from '../LevelBadge'

describe('LevelBadge', () => {
  it('renders default variant with level text', () => {
    render(<LevelBadge level="error" />)

    expect(screen.getByTestId('level-badge')).toBeInTheDocument()
    expect(screen.getByTestId('level-badge-indicator')).toBeInTheDocument()
    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('renders compact variant as dot only', () => {
    render(<LevelBadge level="warning" variant="compact" />)

    expect(screen.getByTestId('level-badge-dot')).toBeInTheDocument()
    expect(screen.queryByText('warning')).not.toBeInTheDocument()
  })

  it.each([
    ['fatal', 'bg-red-600'],
    ['error', 'bg-red-500'],
    ['warning', 'bg-amber-500'],
    ['info', 'bg-sky-500'],
    ['debug', 'bg-slate-500'],
    ['ERROR', 'bg-red-500'],      // case-insensitive
    ['custom', 'bg-sky-500'],     // unknown levels read as info
  ])('uses a %s dot colour of %s', (level, dot) => {
    render(<LevelBadge level={level} />)
    expect(screen.getByTestId('level-badge-indicator')).toHaveClass(dot, 'h-2', 'w-2', 'rounded-full')
    expect(screen.getByText(level)).toBeInTheDocument()
  })

  it('is a dot and a word, not a filled pill', () => {
    render(<LevelBadge level="warning" />)
    const badge = screen.getByTestId('level-badge')
    expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1.5', 'text-xs')
    expect(badge.className).not.toMatch(/\bborder\b|bg-\w+-\d+\/\d+|\brounded\b/)
  })

  it('shows fatal in a stronger weight', () => {
    render(<LevelBadge level="fatal" />)
    expect(screen.getByText('fatal')).toHaveClass('font-semibold')
  })

  it('compact variant applies correct dot styles', () => {
    render(<LevelBadge level="error" variant="compact" />)

    const dot = screen.getByTestId('level-badge-dot')
    expect(dot).toHaveClass('bg-red-500', 'h-2', 'w-2', 'rounded-full')
  })

  it('compact variant has title attribute with level', () => {
    render(<LevelBadge level="warning" variant="compact" />)

    expect(screen.getByTestId('level-badge-dot')).toHaveAttribute('title', 'warning')
  })

  it('applies custom testId', () => {
    render(<LevelBadge level="info" testId="custom-badge" />)

    expect(screen.getByTestId('custom-badge')).toBeInTheDocument()
    expect(screen.getByTestId('custom-badge-indicator')).toBeInTheDocument()
  })

  it('applies custom testId to compact variant', () => {
    render(<LevelBadge level="info" variant="compact" testId="custom-badge" />)

    expect(screen.getByTestId('custom-badge-dot')).toBeInTheDocument()
  })

  it('capitalizes level text in display', () => {
    render(<LevelBadge level="error" />)

    expect(screen.getByText('error')).toHaveClass('capitalize')
  })
})
