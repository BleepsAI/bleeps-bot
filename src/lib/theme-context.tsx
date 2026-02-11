'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Get saved theme or default to dark
    const saved = localStorage.getItem('bleeps_theme') as Theme | null
    if (saved) {
      setThemeState(saved)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Apply theme to html element
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Save preference
    localStorage.setItem('bleeps_theme', theme)

    // Update theme-color meta tag
    const themeColor = theme === 'dark' ? '#0F0F11' : '#ffffff'
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor)
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
