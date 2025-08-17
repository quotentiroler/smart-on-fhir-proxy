import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

// Utilities to mock and restore matchMedia
const originalMatchMedia = window.matchMedia
const setupMatchMedia = (prefersDark: boolean) => {
  const mock = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark && query.includes('prefers-color-scheme: dark'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  Object.defineProperty(window, 'matchMedia', { value: mock, configurable: true })
  return mock
}

describe('ThemeProvider behavior', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    // restore original matchMedia after each test to avoid leakage
    Object.defineProperty(window, 'matchMedia', { value: originalMatchMedia, configurable: true })
  })

  it('uses system preference (prefers-color-scheme) when no saved theme', () => {
    setupMatchMedia(true) // system prefers dark

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    const themeEl = screen.getByLabelText('theme')
    expect(themeEl).toHaveTextContent('dark')
  })

  it('persists theme to localStorage and rehydrates on remount', async () => {
    setupMatchMedia(false) // ensure a deterministic non-dark default if implementation uses system
    const user = userEvent.setup()

    const { unmount } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    // Change theme to dark
    await user.click(screen.getByText('Set Dark'))
    expect(localStorage.getItem('theme')).toBe('dark')

    // Unmount and remount to verify it picks up saved theme
    unmount()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    const themeEl = screen.getByLabelText('theme')
    expect(themeEl).toHaveTextContent('dark')
  })
})
