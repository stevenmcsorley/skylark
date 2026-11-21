import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { EventsList } from '../EventsList'

/**
 * Two features that make Skylark Skylark and must survive any redesign:
 *  1. an event shows whether its stack was symbolicated from a stored source map ("symbolicated: stored"),
 *     with the original file, line and column;
 *  2. the Explore chart lets you drag across its bars to filter the time range.
 */
describe('symbolicated stacks', () => {
  it('says where a symbolicated stack came from and shows the original frames', () => {
    const event = { id: 7, message: 'boom', level: 'error', received_at: '2026-11-21T10:00:00Z' } as any
    const details = { 7: { id: 7, message: 'boom', level: 'error', stack: 'minified', _symSource: 'stored', symbolicated: { frames: [{ function: 'handleClick', orig_file: 'src/Button.tsx', orig_line: 12, orig_column: 5 }] } } } as any
    render(<EventsList events={[event]} eventDetails={details} onView={vi.fn()} eventLimit={50} setEventLimit={vi.fn()} eventOffset={0} setEventOffset={vi.fn()} eventTotal={1} />)
    fireEvent.click(screen.getByTestId('toggle-event-7'))
    expect(screen.getByText('symbolicated: stored')).toBeInTheDocument()
    expect(screen.getByText('handleClick')).toBeInTheDocument()
    expect(screen.getByText('src/Button.tsx:12:5')).toBeInTheDocument()
  })
})

describe('drag across the logs chart', () => {
  it('keeps the brush wiring that turns a drag over the bars into a time filter', () => {
    const source = readFileSync('src/ui/components/LogsView/LogsChart.tsx', 'utf8')
    expect(source).toContain("takeGlobalCursor")
    expect(source).toContain("brushType: 'lineX'")
    expect(source).toMatch(/brushEnd|brushSelected/)
    expect(source).toMatch(/setTimeSel\(\{ from: fromISO, to: toISO \}\)/)
  })
})
