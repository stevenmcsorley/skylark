import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAppRouting } from '../useAppRouting'
import { mockProjects } from '../../../test/utils'

const setHash = (hash: string) => { window.history.replaceState(null, '', hash || '#') }
beforeEach(() => { try { localStorage.clear() } catch { /* */ } setHash('#') })
afterEach(() => vi.restoreAllMocks())

describe('routing: issues', () => {
  it('reads the open issue, status tab and search from the URL', () => {
    setHash('#view=issues&project=' + mockProjects[0].slug + '&issue=12&istatus=resolved&iq=timeout')
    const { result } = renderHook(() => useAppRouting(mockProjects))
    expect(result.current.activeTab).toBe('inbox')
    expect(result.current.issue).toBe(12)
    expect(result.current.issueStatus).toBe('resolved')
    expect(result.current.issueQuery).toBe('timeout')
  })

  it('defaults to the unresolved tab, no issue and no search; an unknown status falls back', () => {
    setHash('#view=issues&istatus=bogus&issue=abc')
    const { result } = renderHook(() => useAppRouting(mockProjects))
    expect(result.current.issueStatus).toBe('unresolved')
    expect(result.current.issue).toBeNull()
    expect(result.current.issueQuery).toBe('')
  })

  it('opening an issue pushes a history entry (Back returns to the list); filters only replace', () => {
    const push = vi.spyOn(window.history, 'pushState'); const replace = vi.spyOn(window.history, 'replaceState')
    const { result } = renderHook(() => useAppRouting(mockProjects))
    act(() => result.current.openIssue(9))
    expect(push).toHaveBeenCalledTimes(1)
    expect(String(push.mock.calls[0][2])).toMatch(/view=inbox/); expect(String(push.mock.calls[0][2])).toMatch(/issue=9/)
    expect(result.current.issue).toBe(9); expect(result.current.activeTab).toBe('inbox')
    push.mockClear()
    act(() => result.current.setIssueStatus('all')); act(() => result.current.setIssueQuery('boom'))
    expect(push).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalled()
    expect(window.location.hash).toMatch(/istatus=all/); expect(window.location.hash).toMatch(/iq=boom/)
  })

  it('closing the issue removes it from the URL, and leaving the Issues view clears it', () => {
    setHash('#view=issues&issue=4')
    const { result } = renderHook(() => useAppRouting(mockProjects))
    act(() => result.current.openIssue(null))
    expect(result.current.issue).toBeNull(); expect(window.location.hash).not.toMatch(/issue=/)
    act(() => result.current.openIssue(6)); act(() => result.current.setActiveTab('alerts'))
    expect(result.current.issue).toBeNull(); expect(window.location.hash).not.toMatch(/issue=/)
  })

  it('follows Back/Forward: a hashchange to an issue URL opens it', () => {
    const { result } = renderHook(() => useAppRouting(mockProjects))
    act(() => { setHash('#view=issues&issue=33'); window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(result.current.issue).toBe(33)
  })
})
