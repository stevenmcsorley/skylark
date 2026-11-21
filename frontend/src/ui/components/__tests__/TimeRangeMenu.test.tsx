import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TimeRangeMenu } from '../TimeRangeMenu'

const base = { range: '24h' as const, setRange: vi.fn(), setInterval: vi.fn(), setTimeSel: vi.fn() }
const labelOf = () => screen.getByTestId('time-range-menu').textContent

describe('TimeRangeMenu label', () => {
  it('shows the preset when no custom range is applied', () => {
    render(<TimeRangeMenu {...base} />)
    expect(labelOf()).toContain('24H')
  })

  it('shows a custom range restored from the URL instead of 24H', () => {
    render(<TimeRangeMenu {...base} customRange={{ value: 2, unit: 'h', label: 'Last 2h' }} />)
    expect(labelOf()).toContain('Last 2h')
    expect(labelOf()).not.toContain('24H')
  })

  it('goes back to the preset when the router clears the custom range', () => {
    const { rerender } = render(<TimeRangeMenu {...base} customRange={{ value: 2, unit: 'h', label: 'Last 2h' }} />)
    rerender(<TimeRangeMenu {...base} customRange={null} />)
    expect(labelOf()).toContain('24H')
  })
})
