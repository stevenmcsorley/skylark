import { fireEvent, render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { Dashboard } from '../Dashboard'
import { errorRate, eventsPerMinute } from '../utils/dashboardStats'

vi.mock('echarts-for-react', () => ({
  default: () => <div data-testid="chart" />
}))

describe('Dashboard', () => {
  beforeEach(() => {
    server.use(...['dashboard/top-groups', 'releases/health', 'releases', 'deployments'].map(path =>
      http.get(`*/api/${path}/`, () => HttpResponse.json([]))
    ))
  })

  it.each([{ series: [] }, { series: [{ bucket: '2024-01-01', error: 0, warning: 0, info: 0 }] }])(
    'shows the empty state when no events were received (%#)', async ({ series }) => {
      server.use(http.get('*/api/dashboard/series/', () => HttpResponse.json(series)))
      const openProjects = vi.fn()
      render(<Dashboard projectSlug="test-project" onOpenProjects={openProjects} />)
      expect(await screen.findByRole('heading', { name: 'No events in this period' })).toBeInTheDocument()
      expect(screen.getByTitle('No release health data')).toHaveTextContent('-')
      expect(screen.getAllByTitle('No events in this period').every(el => el.textContent === '-')).toBe(true)
      expect(document.body).not.toHaveTextContent(/LCP|FCP|CLS|FID|Apdex|Slow Page|Poor Apdex|100\.00%/)
      const select = screen.getByRole('combobox', { name: 'Dashboard template' })
      expect(within(select).getAllByRole('option').map(option => option.textContent))
        .toEqual(['Current Template', 'General Template'])
      fireEvent.click(screen.getByRole('button', { name: 'Go to Projects' }))
      expect(openProjects).toHaveBeenCalledOnce()
    }
  )

  it('displays measured rates for the selected interval', async () => {
    const series = [{ bucket: '2024-01-01', error: 0, warning: 20, info: 10 }]
    server.use(http.get('*/api/dashboard/series/', () => HttpResponse.json(series)))
    render(<Dashboard projectSlug="test-project" />)
    expect(await screen.findByText(`${errorRate(series)?.toFixed(2)}%`)).toHaveClass('text-accent-400')
    expect(screen.getByText(`Average: ${eventsPerMinute(series, 5)?.toFixed(1)}`)).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('5m'), { target: { value: '1h' } })
    expect(await screen.findByText(`Average: ${eventsPerMinute(series, 60)?.toFixed(1)}`)).toBeInTheDocument()
  })
})
