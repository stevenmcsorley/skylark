import { describe, expect, it } from 'vitest'
import { crashFreeRate, errorRate, eventsPerMinute, rateTone, totalEvents } from '../utils/dashboardStats'

describe('dashboard statistics', () => {
  const mixed = [{ error: 2, warning: 5, info: 3 }, { error: 3, warning: 0, info: 7 }]

  it('counts events across severities and buckets', () => {
    expect(totalEvents([])).toBe(0)
    expect(totalEvents(mixed)).toBe(20)
    expect(errorRate([])).toBeNull()
    expect(errorRate([{ error: 0, warning: 0, info: 0 }])).toBeNull()
    expect(errorRate(mixed)).toBe(25)
    expect(errorRate([{ error: 4, warning: 0, info: 0 }])).toBe(100)
    expect(rateTone(errorRate([{ error: 0, warning: 0, info: 4 }]))).toBe('good')
  })

  it('classifies rates before rounding', () => {
    expect(rateTone(null)).toBe('none')
    expect(rateTone(0.001)).toBe('warn')
    expect(rateTone(4.999)).toBe('warn')
    expect(rateTone(5)).toBe('bad')
    expect(rateTone(100)).toBe('bad')
  })

  it('averages reported crash-free rates', () => {
    expect(crashFreeRate([])).toBeNull()
    expect(crashFreeRate([{ crash_free_rate: 0 }, { crash_free_rate: 100 }])).toBe(50)
  })

  it('uses the full bucket duration for events per minute', () => {
    expect(eventsPerMinute([], 5)).toBeNull()
    expect(eventsPerMinute(mixed, 5)).toBe(2)
    expect(eventsPerMinute(mixed, 60)).toBeCloseTo(1 / 6)
  })
})
