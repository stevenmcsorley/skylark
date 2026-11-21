import { fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { vi } from 'vitest'
import { mockProject, mockProjects } from '../../../test/utils'
import { OverviewPage } from '../OverviewPage'
import { McpPage } from '../McpPage'
import { ProjectsTab } from '../ProjectsTab'

it('masks every Projects table token before reveal', () => {
  const { container } = render(<ProjectsTab projects={mockProjects} setSelected={vi.fn()} onCreate={vi.fn()} />)
  for (const project of mockProjects) expect(container.textContent).not.toContain(project.ingest_token)
  fireEvent.click(screen.getByRole('button', { name: 'Reveal Test Project ingest token' }))
  expect(container.textContent).toContain(mockProject.ingest_token)
  expect(container.textContent).not.toContain(mockProjects[1].ingest_token)
})

it('shows the Overview endpoint with only the token masked', async () => {
  server.use(
    http.get('/api/integrations/', () => HttpResponse.json({ integrations: [] })),
    http.get('/api/projects/test-project/overview/', () => HttpResponse.json({
      project: mockProject, ingest_endpoint: `/api/events/ingest/token/${mockProject.ingest_token}/`,
      stats: {}, tracking: [], releases: [], integrations: [], alert_rules: [],
      sources: { environments: [], platforms: [], tag_keys: [] },
    })),
  )
  const noop = vi.fn()
  const { container } = render(<OverviewPage selected={mockProject} releases={[]} createRelease={noop}
    deploys={[]} createDeployment={noop} sessionUser="" setSessionUser={noop} sendSession={noop}
    range="24h" setRange={noop} interval="1h" setInterval={noop} refreshSeries={noop} series={[]} health={[]}
    rules={[]} createRule={noop} editRule={{ threshold: 1, window: 1, notify: 1 }} setEditRule={noop}
    updateFirstRule={noop} groups={[]} setGroups={noop} snoozeGroup={noop} />)
  await screen.findByTestId('tracking-overview')
  expect(container.textContent).not.toContain(mockProject.ingest_token)
  expect(container.textContent).toContain('/api/events/ingest/token/test••••••••-123/')
  fireEvent.click(screen.getByRole('button', { name: 'Reveal ingest token' }))
  expect(container.textContent).toContain(`/api/events/ingest/token/${mockProject.ingest_token}/`)
})

it('masks the newly created API token in both the token and registration command', async () => {
  const token = 'new-api-token-5678'
  server.use(
    http.get('/api/tokens/', () => HttpResponse.json([])),
    http.post('/api/tokens/', () => HttpResponse.json({ token })),
  )
  const { container } = render(<McpPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Create API token' }))
  const reveal = await screen.findByRole('button', { name: 'Reveal command' })
  expect(container.textContent).not.toContain(token)
  fireEvent.click(reveal)
  expect(container.textContent).toContain(`Authorization: Bearer ${token}`)
})
