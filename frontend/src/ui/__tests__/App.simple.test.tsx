import { render, screen } from '@testing-library/react'
import { App } from '../App'
import { AuthProvider } from '../auth/AuthContext'

const renderApp = () =>
  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  )

// Simple test without complex mocking
describe('App - Basic Tests', () => {
  it('renders without crashing', () => {
    // This test just verifies the component can be imported and rendered
    // Even if it errors, we can catch that
    expect(() => {
      renderApp()
    }).not.toThrow()
  })

  it('contains the main app title', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Skylark', level: 1 })).toBeInTheDocument()
  })
})
