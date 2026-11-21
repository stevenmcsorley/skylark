import { act, fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { SecretValue } from '../SecretValue'

const value = 'secret-value-12345'
const controls = <SecretValue value={value} label="token" />

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('masks the secret until revealed and hides it again after 15 seconds', () => {
  vi.useFakeTimers()
  const { container } = render(controls)
  expect(container.textContent).not.toContain(value)
  const toggle = screen.getByRole('button', { name: 'Reveal token', pressed: false })
  fireEvent.click(toggle)
  expect(toggle).toHaveAccessibleName('Hide token')
  act(() => vi.advanceTimersByTime(14999))
  expect(container.textContent).toContain(value)
  act(() => vi.advanceTimersByTime(1))
  expect(container.textContent).not.toContain(value)
})

it('copies the real value, announces success for two seconds and cleans up timers', async () => {
  vi.useFakeTimers()
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  const { unmount } = render(controls)
  const copy = screen.getByRole('button', { name: 'Copy token' })
  await act(async () => { fireEvent.click(copy) })
  expect(writeText).toHaveBeenCalledWith(value)
  act(() => vi.advanceTimersByTime(1999))
  expect(screen.getByRole('status')).toHaveTextContent('Copied')
  act(() => vi.advanceTimersByTime(1))
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  await act(async () => { fireEvent.click(copy) })
  fireEvent.click(screen.getByTestId('secret-reveal'))
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  Reflect.deleteProperty(navigator, 'clipboard')
})

it('copies via a temporary textarea when clipboard is unavailable', () => {
  const execCommand = vi.fn(() => {
    expect(document.querySelector('textarea')?.value).toBe(value)
    return true
  })
  Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })
  try {
    render(controls)
    fireEvent.click(screen.getByTestId('secret-copy'))
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
  } finally {
    Reflect.deleteProperty(document, 'execCommand')
  }
})
