import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Modal } from '../ui/Modal'
import { HelpPage } from '../HelpPage'

const Harness = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open it</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Dialog"><input aria-label="Name" /><button>Save</button></Modal>
    </>
  )
}

describe('Modal focus', () => {
  it('moves focus in, keeps Tab inside, and hands focus back to the opener', () => {
    render(<Harness />)
    const opener = screen.getByText('Open it')
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByLabelText('Name')).toHaveFocus()
    screen.getByText('Save').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(opener).toHaveFocus()
  })
})

describe('HelpPage', () => {
  it('describes the pages that exist, starting with where to start', () => {
    render(<HelpPage />)
    expect(screen.getByRole('heading', { name: 'Where to start' })).toBeInTheDocument()
    for (const page of ['Inbox', 'Apps', 'Explore', 'Settings']) expect(screen.getAllByText(page).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Dashboards|Tracking item|Create a project/)).not.toBeInTheDocument()
  })
})
