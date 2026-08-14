import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ThemeColors {
  bg: string
  bgCard: string
  bgSecondary: string
  bgTertiary: string
  text: string
  textSecondary: string
  textTertiary: string
  border: string
  primary: string
  primaryHover: string
  danger: string
  success: string
  warning: string
}

const DARK: ThemeColors = {
  bg: '#0d1117',
  bgCard: '#161b22',
  bgSecondary: '#161b22',
  bgTertiary: '#21262d',
  text: '#e6edf3',
  textSecondary: '#c9d1d9',
  textTertiary: '#8b949e',
  border: '#30363d',
  primary: '#58a6ff',
  primaryHover: '#79c0ff',
  danger: '#f85149',
  success: '#3fb950',
  warning: '#d29922',
}

const LIGHT: ThemeColors = {
  bg: '#ffffff',
  bgCard: '#f6f8fa',
  bgSecondary: '#f6f8fa',
  bgTertiary: '#eaeef2',
  text: '#24292f',
  textSecondary: '#424a53',
  textTertiary: '#57606a',
  border: '#d0d7de',
  primary: '#0969da',
  primaryHover: '#0860ca',
  danger: '#cf222e',
  success: '#1a7f37',
  warning: '#9e6a03',
}

const STORAGE_KEY = 'simtrg-theme'

function preferenciaInicial(): boolean {
  const guardada = localStorage.getItem(STORAGE_KEY)
  if (guardada === 'dark') return true
  if (guardada === 'light') return false
  const hora = new Date().getHours()
  return hora >= 18 || hora < 6
}

interface ThemeContextValue {
  isDarkMode: boolean
  toggleDarkMode: () => void
  colors: ThemeColors
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(preferenciaInicial)

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light'
    localStorage.setItem(STORAGE_KEY, isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode((v) => !v)
  const colors = isDarkMode ? DARK : LIGHT

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
