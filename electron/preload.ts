import { contextBridge, ipcRenderer } from 'electron'

let lastPointerInside = false

contextBridge.exposeInMainWorld('glyph', {
  telemetry: (callback: (data: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('telemetry:update', listener)
    return () => ipcRenderer.removeListener('telemetry:update', listener)
  },
  clipboard: (callback: (items: string[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, items: string[]) => callback(items)
    ipcRenderer.on('clipboard:update', listener)
    return () => ipcRenderer.removeListener('clipboard:update', listener)
  },
  theme: (callback: (theme: 'dark' | 'light') => void) => {
    const listener = (_event: Electron.IpcRendererEvent, value: 'dark' | 'light') => callback(value)
    ipcRenderer.on('theme:set', listener)
    return () => ipcRenderer.removeListener('theme:set', listener)
  },
  pointer: (inside: boolean) => {
    if (lastPointerInside === inside) return
    lastPointerInside = inside
    ipcRenderer.send('overlay:pointer', inside)
  },
  telemetryActive: (active: boolean) => ipcRenderer.send('telemetry:active', active),
  toggleTheme: () => ipcRenderer.send('theme:toggle'),
  resetPosition: () => ipcRenderer.send('window:reset-position'),
  setTheme: (theme: 'dark' | 'light') => ipcRenderer.send('theme:set', theme),
  copy: (text: string) => ipcRenderer.invoke('clipboard:write', text),
})

