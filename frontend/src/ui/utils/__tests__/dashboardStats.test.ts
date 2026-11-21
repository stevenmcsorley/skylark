
import { bucketLabel } from '../../Dashboard'

describe('bucketLabel (chart time axis)', () => {
  const HOUR = 3600 * 1000
  it('shows a short clock time for a day or so and never the raw ISO string', () => {
    const label = bucketLabel('2026-11-20T05:27:00+00:00', 24 * HOUR)
    expect(label).toMatch(/^\d{2}:\d{2}$/)
    expect(label).not.toMatch(/T|\+00/)
  })
  it('switches to the date for long ranges', () => {
    const label = bucketLabel('2026-11-20T05:27:00+00:00', 7 * 24 * HOUR)
    expect(label).toMatch(/Nov/); expect(label).not.toMatch(/:/)
  })
  it('passes garbage through instead of showing "Invalid Date"', () => {
    expect(bucketLabel('nope', 0)).toBe('nope')
  })
})
