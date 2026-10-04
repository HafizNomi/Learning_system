import { useCallback, useEffect, useState } from 'react'

/**
 * Day / night mode.
 *
 * Three states, not two: `system` follows the operating system and keeps
 * following it, which is what most people actually want. An explicit `light`
 * or `dark` is a deliberate override and sticks until they change it back.
 *
 * The chosen theme is written to `data-theme` on <html>, which is what the
 * palette in styles/index.css keys off. index.html applies the same value
 * before first paint, so the page never flashes white on the way in.
 */

export const THEME_KEY = 'theme'
export const THEMES = ['light', 'dark', 'system']

const prefersDark = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return THEMES.includes(stored) ? stored : 'system'
  } catch {
    // Private browsing, or site data blocked.
    return 'system'
  }
}

/** The theme actually painted, once `system` has been resolved. */
export const resolveTheme = (theme) =>
  theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme

const applyTheme = (theme) => {
  document.documentElement.dataset.theme = resolveTheme(theme)
}

const useTheme = () => {
  const [theme, setThemeState] = useState(readStoredTheme)

  // Paint whatever is chosen, and remember it.
  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* the page still looks right, it just will not be remembered */
    }
  }, [theme])

  // While on `system`, track the OS so the page changes with it - someone on
  // an automatic night schedule should not have to reload at sunset.
  useEffect(() => {
    if (theme !== 'system') return undefined

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) setThemeState(next)
  }, [])

  /** Flip to the opposite of what is on screen right now. */
  const toggleTheme = useCallback(() => {
    setThemeState((current) => (resolveTheme(current) === 'dark' ? 'light' : 'dark'))
  }, [])

  return {
    theme,                            // 'light' | 'dark' | 'system'
    resolvedTheme: resolveTheme(theme), // what is actually painted
    isDark: resolveTheme(theme) === 'dark',
    setTheme,
    toggleTheme,
  }
}

export default useTheme
