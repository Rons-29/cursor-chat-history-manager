import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export type ThemeColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark'
  themeColor: ThemeColor
  setTheme: (theme: Theme) => void
  setThemeColor: (color: ThemeColor) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // ローカルストレージから設定を読み込み
    const saved = localStorage.getItem('chat-history-theme')
    return (saved as Theme) || 'system'
  })

  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    // ローカルストレージからカラー設定を読み込み
    const saved = localStorage.getItem('chat-history-theme-color')
    return (saved as ThemeColor) || 'blue'
  })

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme === 'dark' ? 'dark' : 'light'
  })

  // テーマカラーのCSS変数を適用
  useEffect(() => {
    const root = window.document.documentElement
    
    // カラーパレット定義
    const colorPalettes = {
      blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a'
      },
      purple: {
        50: '#faf5ff',
        100: '#f3e8ff',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
        800: '#5b21b6',
        900: '#4c1d95'
      },
      green: {
        50: '#f0fdf4',
        100: '#dcfce7',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d'
      },
      orange: {
        50: '#fff7ed',
        100: '#ffedd5',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
        900: '#7c2d12'
      },
      pink: {
        50: '#fdf2f8',
        100: '#fce7f3',
        500: '#ec4899',
        600: '#db2777',
        700: '#be185d',
        800: '#9d174d',
        900: '#831843'
      },
      indigo: {
        50: '#eef2ff',
        100: '#e0e7ff',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81'
      }
    }

    const palette = colorPalettes[themeColor]
    
    // CSS変数を設定
    Object.entries(palette).forEach(([shade, color]) => {
      root.style.setProperty(`--color-primary-${shade}`, color)
    })

    // ローカルストレージに保存
    localStorage.setItem('chat-history-theme-color', themeColor)

    console.log('🎨 テーマカラー変更:', themeColor)
  }, [themeColor])

  // システムテーマの変更を監視
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setActualTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // テーマ変更時の処理
  useEffect(() => {
    let newActualTheme: 'light' | 'dark'

    if (theme === 'system') {
      newActualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      newActualTheme = theme === 'dark' ? 'dark' : 'light'
    }

    setActualTheme(newActualTheme)

    // HTMLドキュメントにダークモードクラスを適用
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newActualTheme)

    // ローカルストレージに保存
    localStorage.setItem('chat-history-theme', theme)

    console.log('🎨 テーマ変更:', { theme, actualTheme: newActualTheme })
  }, [theme])

  const handleSetTheme = (newTheme: Theme) => {
    console.log('🎨 テーマ設定変更:', newTheme)
    setTheme(newTheme)
  }

  const handleSetThemeColor = (newColor: ThemeColor) => {
    console.log('🎨 テーマカラー設定変更:', newColor)
    setThemeColor(newColor)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        actualTheme,
        themeColor,
        setTheme: handleSetTheme,
        setThemeColor: handleSetThemeColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
} 