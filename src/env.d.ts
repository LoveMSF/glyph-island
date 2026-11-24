/// <reference types="vite/client" />

interface Window {
  glyph: {
    telemetry: (callback: (data: unknown) => void) => () => void
    clipboard: (callback: (items: string[]) => void) => () => void
    theme: (callback: (theme: 'dark' | 'light') => void) => () => void
    pointer: (inside: boolean) => void
    telemetryActive: (active: boolean) => void
    toggleTheme: () => void
    resetPosition: () => void
    setTheme: (theme: 'dark' | 'light') => void
    copy: (text: string) => Promise<void>
  }
}
