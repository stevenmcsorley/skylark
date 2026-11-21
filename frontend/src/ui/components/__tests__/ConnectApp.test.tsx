import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectApp, buildDsn, maskDsn, snippet } from '../ConnectApp'

vi.mock('../../utils/api.utils', () => ({ api: vi.fn() }))
import { api } from '../../utils/api.utils'

const project = { id: 7, name: 'Web', slug: 'web', ingest_token: 'abcd1234efgh5678ijkl' }
const dsn = 'https://abcd1234efgh5678ijkl@skylark.example.com/7'
const withProjectDsn = { ...project, dsn }

let writeText: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.mocked(api).mockReset()
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
afterEach(() => { vi.unstubAllGlobals() })

describe('DSN helpers', () => {
  it('uses the DSN from the API and otherwise builds one from the page origin', () => {
    expect(buildDsn(withProjectDsn)).toBe(dsn)
    expect(buildDsn(project, 'https://skylark.example.com')).toBe(dsn)
    expect(buildDsn(project, 'http://localhost:5174')).toBe('http://abcd1234efgh5678ijkl@localhost:5174/7')
  })

  it('masks only the key part of a DSN', () => {
    const masked = maskDsn(dsn)
    expect(masked).toBe('https://abcd••••••••ijkl@skylark.example.com/7')
    expect(masked).not.toContain('1234efgh5678')
    expect(maskDsn('not a dsn')).toBe('not a dsn')
  })

  it('writes the right snippet for each language and never leaves a placeholder behind', () => {
    expect(snippet('Python', dsn, project).code).toContain(`dsn="${dsn}"`)
    expect(snippet('Python', dsn, project).install).toBe('pip install sentry-sdk')
    expect(snippet('JavaScript', dsn, project).code).toContain(`dsn: "${dsn}"`)
    expect(snippet('Node.js', dsn, project).install).toBe('npm install @sentry/node')
    const http = snippet('HTTP', dsn, project, 'https://skylark.example.com')
    expect(http.code).toContain('https://skylark.example.com/api/events/ingest/token/abcd1234efgh5678ijkl/')
    expect(http.install).toBeUndefined()
    for (const t of ['Python', 'JavaScript', 'Node.js', 'HTTP'] as const) expect(snippet(t, dsn, project).code).not.toMatch(/YOUR_|<dsn>|undefined/i)
  })
})

describe('ConnectApp', () => {
  it('hides the key until revealed, everywhere it appears, and hides it again', async () => {
    vi.mocked(api).mockResolvedValue({ results: [] })
    render(<ConnectApp project={withProjectDsn} pollMs={60000} />)
    expect(screen.getByTestId('connect-dsn')).not.toHaveTextContent('1234efgh5678')
    expect(screen.getByTestId('connect-code')).not.toHaveTextContent('1234efgh5678')
    fireEvent.click(screen.getByTestId('connect-reveal'))
    expect(screen.getByTestId('connect-dsn')).toHaveTextContent(dsn)
    expect(screen.getByTestId('connect-code')).toHaveTextContent(dsn)
    fireEvent.click(screen.getByTestId('connect-reveal'))
    expect(screen.getByTestId('connect-dsn')).not.toHaveTextContent('1234efgh5678')
  })

  it('auto-hides a revealed key after 15 seconds', () => {
    vi.useFakeTimers()
    try {
      vi.mocked(api).mockResolvedValue({ results: [] })
      render(<ConnectApp project={withProjectDsn} pollMs={60000} />)
      fireEvent.click(screen.getByTestId('connect-reveal'))
      expect(screen.getByTestId('connect-dsn')).toHaveTextContent(dsn)
      act(() => { vi.advanceTimersByTime(15001) })
      expect(screen.getByTestId('connect-dsn')).not.toHaveTextContent('1234efgh5678')
    } finally { vi.useRealTimers() }
  })

  it('copies the REAL values even while the key is masked on screen', async () => {
    vi.mocked(api).mockResolvedValue({ results: [] })
    render(<ConnectApp project={withProjectDsn} pollMs={60000} />)
    fireEvent.click(screen.getByTestId('connect-copy-dsn'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(dsn))
    fireEvent.click(screen.getByTestId('connect-copy-code'))
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining(`dsn="${dsn}"`)))
  })

  it('switches language tabs', () => {
    vi.mocked(api).mockResolvedValue({ results: [] })
    render(<ConnectApp project={withProjectDsn} pollMs={60000} />)
    expect(screen.getByTestId('connect-install')).toHaveTextContent('pip install sentry-sdk')
    fireEvent.click(screen.getByTestId('connect-tab-HTTP'))
    expect(screen.queryByTestId('connect-install')).not.toBeInTheDocument()
    expect(screen.getByTestId('connect-code')).toHaveTextContent('curl -X POST')
  })

  it('says it is waiting until an event exists, then shows it as connected', async () => {
    vi.mocked(api).mockResolvedValueOnce({ results: [] }).mockResolvedValue({ results: [{ id: 1, received_at: new Date(Date.now() - 120000).toISOString() }] })
    render(<ConnectApp project={withProjectDsn} pollMs={20} />)
    expect(await screen.findByText(/Waiting for the first event/)).toBeInTheDocument()
    expect(await screen.findByText(/Connected\. Last event 2m ago/)).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/api/events/?project=web&limit=1')
  })

  it('sends a test event to the project\'s own ingest URL, then re-checks', async () => {
    vi.mocked(api).mockResolvedValue({ results: [] })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 })
    vi.stubGlobal('fetch', fetchMock)
    render(<ConnectApp project={withProjectDsn} pollMs={60000} />)
    await screen.findByText(/Waiting/)
    const calls = vi.mocked(api).mock.calls.length
    fireEvent.click(screen.getByTestId('connect-send-test'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/events/ingest/token/abcd1234efgh5678ijkl/'); expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toMatchObject({ message: 'Skylark test event', level: 'info' })
    await waitFor(() => expect(vi.mocked(api).mock.calls.length).toBeGreaterThan(calls))
  })

  it('reports a rate limit and any other failure in words', async () => {
    vi.mocked(api).mockResolvedValue({ results: [] })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 429 }).mockResolvedValueOnce({ ok: false, status: 500 }))
    render(<ConnectApp project={withProjectDsn} pollMs={60000} />)
    fireEvent.click(screen.getByTestId('connect-send-test'))
    expect(await screen.findByTestId('connect-error')).toHaveTextContent('Rate limited')
    fireEvent.click(screen.getByTestId('connect-send-test'))
    await waitFor(() => expect(screen.getByTestId('connect-error')).toHaveTextContent('The server answered 500'))
  })
})
