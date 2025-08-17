import { createContext, useCallback, useEffect, useMemo, useState, useContext } from "react"
import { getTheme, setTheme as setThemeStorage } from "@/lib/storage"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

// Internal context type with a sentinel to detect provider usage
type InternalThemeContext = ThemeProviderState & { __provider?: true }

const initialState: InternalThemeContext = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<InternalThemeContext | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: Readonly<ThemeProviderProps>) {
  const [theme, setTheme] = useState<Theme>(() => (getTheme(storageKey, defaultTheme) as Theme))

  useEffect(() => {
    const root = window.document.documentElement

    // Always remove both to avoid duplicates
    root.classList.remove("light", "dark")

    if (theme === "system") {
      // Guard for environments where matchMedia is not available
      if (typeof window.matchMedia !== "function") {
        // default to light when matchMedia not available
        root.classList.add("light")
        return
      }

      const mql = window.matchMedia("(prefers-color-scheme: dark)")

      const apply = (isDark: boolean) => {
        root.classList.remove("light", "dark")
        root.classList.add(isDark ? "dark" : "light")
      }

      // Apply initial value
      apply(mql.matches)

      // Listen for changes in OS preference. Support modern and legacy APIs.
      const listener = (event: MediaQueryListEvent | MediaQueryList) => {
        const matches = "matches" in event ? event.matches : mql.matches
        apply(matches)
      }

      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", listener as EventListener)
      } else if (typeof (mql as any).addListener === "function") {
        ;(mql as any).addListener(listener)
      }
      // Also set onchange for environments/tests that rely on it
      ;(mql as any).onchange = listener as any

      return () => {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", listener as EventListener)
        } else if (typeof (mql as any).removeListener === "function") {
          ;(mql as any).removeListener(listener)
        }
        if ("onchange" in mql) {
          ;(mql as any).onchange = null
        }
      }
    }

    // Explicit theme
    root.classList.add(theme)
  }, [theme])

  const handleSetTheme = useCallback(
    (newTheme: Theme) => {
      setThemeStorage(storageKey, newTheme)
      setTheme(newTheme)
    },
    [storageKey]
  )

  const value: InternalThemeContext = useMemo(
    () => ({
      theme,
      setTheme: handleSetTheme,
      __provider: true,
    }),
    [theme, handleSetTheme]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export { ThemeProviderContext }

// Hook for consuming theme context. Throws when used outside provider (test expectation)
export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext)
  if (!context.__provider) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
