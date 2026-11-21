import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { mockProjects } from '../../../test/utils'
import { NAV_ITEMS } from '../../navigation'
import { useAppRouting } from '../../hooks/useAppRouting'
import { NavRail } from '../NavRail'

const Navigation = () => {
  const routing = useAppRouting([])
  return <>
    <NavRail activeTab={routing.activeTab} onChange={routing.setActiveTab} />
    <button onClick={() => routing.setFilterEnv('production')}>Filter</button>
  </>
}

describe('navigation', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/')
    localStorage.clear()
  })
  afterEach(() => vi.restoreAllMocks())

  it.each(NAV_ITEMS)('opens $id from its URL', ({ id, label }) => {
    history.replaceState(null, '', '#view=' + id)
    render(<Navigation />)
    for (const item of NAV_ITEMS) {
      const link = screen.getByRole('link', { name: item.label })
      expect(link).toHaveAttribute('href', '#view=' + item.id)
      expect(link.getAttribute('aria-current')).toBe(item.id === id ? 'page' : null)
    }
    expect(document.title).toBe(label + ' · Skylark')
  })

  it.each([
    ['#view=unknown', 'overview'],
    ['#view=releases', 'releases'],
    ['', 'overview'],
  ])('resolves %s after projects load', (hash, expected) => {
    history.replaceState(null, '', '/' + hash)
    localStorage.setItem('skylark-last-project', mockProjects[1].slug)
    const { result, rerender } = renderHook(({ loaded }) => useAppRouting(loaded ? mockProjects : []), {
      initialProps: { loaded: false },
    })
    rerender({ loaded: true })
    expect(result.current.activeTab).toBe(expected)
    expect(result.current.selected).toEqual(mockProjects[1])
  })

  it('remembers the collapsed sidebar', () => {
    const { unmount } = render(<Navigation />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    unmount()
    render(<Navigation />)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    expect(screen.queryByText('Explore')).toBeNull()
  })

  it('moves focus into the drawer and restores it on Escape', () => {
    render(<Navigation />)
    const menu = screen.getByRole('button', { name: 'Open navigation' })
    fireEvent.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('nav-estate')).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(menu).toHaveFocus()
  })

  it('responds to a manual hash edit', () => {
    render(<Navigation />)
    act(() => {
      location.hash = '#view=integrations'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByTestId('nav-integrations')).toHaveAttribute('aria-current', 'page')
  })

  it('pushes views, replaces filters, and restores views on Back and Forward', async () => {
    render(<Navigation />)
    const push = vi.spyOn(history, 'pushState')
    const replace = vi.spyOn(history, 'replaceState')
    fireEvent.click(screen.getByTestId('nav-issues'))
    expect(push).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
    expect(push).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith(null, '', expect.stringContaining('env=production'))
    history.back()
    await waitFor(() => expect(document.title).toBe('All projects · Skylark'))
    history.forward()
    await waitFor(() => expect(document.title).toBe('Issues · Skylark'))
    expect(location.hash).toContain('env=production')
  })
})
