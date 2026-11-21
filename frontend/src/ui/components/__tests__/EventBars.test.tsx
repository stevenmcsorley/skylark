import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventBars } from '../EventBars'
import { bucketEvents } from '../IssueDetail'

describe('EventBars', () => {
  it('writes out its scale and offers the same numbers as a table', () => {
    render(<EventBars rows={[{ bucket: '2026-11-21T10:00:00Z', error: 3, other: 1 }, { bucket: '2026-11-21T11:00:00Z', error: 0, other: 0 }]} startLabel="2h ago" endLabel="now" unit="events per hour" />)
    expect(screen.getByTestId('event-bars-max')).toHaveTextContent('max 4')
    const table = screen.getByRole('table', { hidden: true })
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(3)
    expect(within(table).getByText('4 events per hour')).toBeInTheDocument()
  })
})

describe('bucketEvents', () => {
  const now = Date.parse('2026-11-21T12:30:00Z')
  const ev = (iso: string, level = 'error') => ({ id: 1, message: 'm', level, received_at: iso }) as any

  it('uses a fixed 24-hour window with a bar for every hour, empty or not', () => {
    const { rows, unit } = bucketEvents([ev('2026-11-21T12:10:00Z'), ev('2026-11-21T12:20:00Z', 'warning'), ev('2026-11-21T03:00:00Z')], now)
    expect(unit).toBe('hour'); expect(rows).toHaveLength(24)
    expect(rows[23]).toMatchObject({ error: 1, other: 1 })
    expect(rows.reduce((s, r) => s + r.error + r.other, 0)).toBe(3)
  })

  it('switches to 14 daily bars when stored events reach back more than two days', () => {
    const { rows, unit } = bucketEvents([ev('2026-11-21T12:00:00Z'), ev('2026-11-15T12:00:00Z')], now)
    expect(unit).toBe('day'); expect(rows).toHaveLength(14)
    expect(rows[13].error).toBe(1)
  })
})
