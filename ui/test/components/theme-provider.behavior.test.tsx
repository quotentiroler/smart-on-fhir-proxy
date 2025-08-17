import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/theme-provider'
import { useTheme } from '@/hooks/useTheme'

function ThemeConsumer() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <div aria-label="theme">{theme}</div>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  )
}

// helper to mock prefers-color-scheme
function mockPrefersColorScheme(prefers: 'dark' | 'light' | null) {
  const matches = prefers === 'dark'
  const media = '(prefers-color-scheme: dark)'
  return (query: string) => ({
    matches: query === media ? matches : false,
    media: query,
    onchange: null,
    addEventListener: (_type: string, _listener: () => void) => {},
    removeEventListener: (_type: string, _listener: () => void) => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

describe('ThemeProvider behavior (hook consumer)', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockPrefersColorScheme(null),
    })
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('provides theme and setTheme to consumers, and updates value on interaction', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    // Default theme should render (string value exists)
    const themeDiv = screen.getByLabelText('theme')
    expect(themeDiv).toBeInTheDocument()
    const initialTheme = themeDiv.textContent
    expect(typeof initialTheme).toBe('string')

    // Toggle to dark
    await user.click(screen.getByRole('button', { name: /set dark/i }))
    expect(screen.getByLabelText('theme').textContent).toBe('dark')

    // Toggle to light
    await user.click(screen.getByRole('button', { name: /set light/i }))
    expect(screen.getByLabelText('theme').textContent).toBe('light')

    // Toggle to system
    await user.click(screen.getByRole('button', { name: /set system/i }))
    expect(screen.getByLabelText('theme').textContent).toBe('system')
  })
})
