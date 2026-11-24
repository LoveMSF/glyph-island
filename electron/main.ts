import { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage, clipboard } from 'electron'
import path from 'node:path'
import os from 'node:os'
import si from 'systeminformation'

let win: BrowserWindow | null = null
let tray: Tray | null = null
let theme: 'dark' | 'light' = 'dark'
let clipboardItems: string[] = []
let lastClipboard = ''
let previousCpu: { idle: number; total: number } | null = null
let previousNetwork: { rx: number; tx: number; time: number } | null = null
let overlayInteractive = false
let telemetryExpanded = false
let windowVisible = false
let telemetryTimer: NodeJS.Timeout | undefined
let telemetryInFlight = false

function cpuTimes() {
  return os.cpus().reduce((totals, cpu) => {
    const values = Object.values(cpu.times)
    return { idle: totals.idle + cpu.times.idle, total: totals.total + values.reduce((sum, value) => sum + value, 0) }
  }, { idle: 0, total: 0 })
}

function cpuLoad() {
  const current = cpuTimes()
  if (!previousCpu) { previousCpu = current; return 0 }
  const total = current.total - previousCpu.total
  const idle = current.idle - previousCpu.idle
  previousCpu = current
  return total > 0 ? Math.round(Math.max(0, Math.min(100, (1 - idle / total) * 100))) : 0
}

function updateTelemetryPolling() {
  const shouldPoll = telemetryExpanded && windowVisible && !!win && !win.isDestroyed()
  if (shouldPoll && !telemetryTimer) {
    previousCpu = cpuTimes()
    previousNetwork = null
    void sendTelemetry()
    telemetryTimer = setInterval(() => { void sendTelemetry() }, 3000)
  } else if (!shouldPoll && telemetryTimer) {
    clearInterval(telemetryTimer)
    telemetryTimer = undefined
    previousCpu = null
    previousNetwork = null
  }
}

function positionWindow() {
  if (!win) return
  const display = screen.getPrimaryDisplay()
  const bounds = win.getBounds()
  win.setPosition(Math.round(display.workArea.x + (display.workArea.width - bounds.width) / 2), display.bounds.y + 8)
}

function createWindow() {
  win = new BrowserWindow({
    width: 620, height: 510, x: 0, y: 8, show: false, frame: false, transparent: true,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  positionWindow()
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true, { forward: true })
  win.on('show', () => { windowVisible = true; updateTelemetryPolling() })
  win.on('hide', () => { windowVisible = false; updateTelemetryPolling() })
  win.once('ready-to-show', () => win?.showInactive())
  if (process.env.VITE_DEV_SERVER_URL) void win.loadURL(process.env.VITE_DEV_SERVER_URL)
  else void win.loadFile(path.join(__dirname, '../dist/index.html'))
  win.on('closed', () => { windowVisible = false; win = null; updateTelemetryPolling() })
}

function createTray() {
  const trayMark = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="8" fill="#000"/><path d="M23 10a9 9 0 1 0 1 12h-8v-5h10v9h-4v-2a12 12 0 1 1 1-16z" fill="#fff"/><circle cx="25" cy="8" r="3" fill="#d71921"/></svg>'
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(trayMark)}`)
  tray = new Tray(icon)
  tray.setToolTip('GlyphIsland')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show / Hide Widget', click: () => { if (!win) return; if (win.isVisible()) win.hide(); else { positionWindow(); win.showInactive() } } },
    { label: 'Toggle Dark / Light Nothing Theme', click: () => { theme = theme === 'dark' ? 'light' : 'dark'; win?.webContents.send('theme:set', theme) } },
    { label: 'Reset Position', click: positionWindow },
    { type: 'separator' },
    { label: 'Quit GlyphIsland', click: () => app.quit() },
  ]))
}

async function sendTelemetry() {
  if (!telemetryExpanded || !windowVisible || !win || win.isDestroyed() || telemetryInFlight) return
  telemetryInFlight = true
  try {
    const [battery, network] = await Promise.all([si.battery(), si.networkStats()])
    if (!telemetryExpanded || !windowVisible || !win || win.isDestroyed()) return
    const now = Date.now()
    const rx = network.reduce((sum, item) => sum + (item.rx_bytes || 0), 0)
    const tx = network.reduce((sum, item) => sum + (item.tx_bytes || 0), 0)
    const dt = previousNetwork ? Math.max((now - previousNetwork.time) / 1000, 1) : 0
    const down = previousNetwork ? Math.max(0, (rx - previousNetwork.rx) / dt) : 0
    const up = previousNetwork ? Math.max(0, (tx - previousNetwork.tx) / dt) : 0
    previousNetwork = { rx, tx, time: now }
    const ramTotal = os.totalmem()
    const ramUsed = ramTotal - os.freemem()
    win.webContents.send('telemetry:update', {
      cpu: cpuLoad(), ramUsed, ramTotal,
      ramPercent: Math.round(ramUsed / Math.max(ramTotal, 1) * 100), battery: battery.hasBattery ? Math.round(battery.percent) : null,
      charging: battery.isCharging, down, up,
    })
  } catch (error) { console.error('Telemetry update failed:', error) }
  finally { telemetryInFlight = false }
}

app.whenReady().then(() => {
  createWindow(); createTray()
  ipcMain.on('overlay:pointer', (_event, inside: boolean) => {
    if (overlayInteractive === inside) return
    overlayInteractive = inside
    win?.setIgnoreMouseEvents(!inside, { forward: true })
  })
  ipcMain.on('telemetry:active', (_event, active: boolean) => {
    telemetryExpanded = active
    updateTelemetryPolling()
  })
  ipcMain.on('theme:toggle', () => { theme = theme === 'dark' ? 'light' : 'dark'; win?.webContents.send('theme:set', theme) })
  ipcMain.on('theme:set', (_event, value: 'dark' | 'light') => { theme = value })
  ipcMain.on('window:reset-position', positionWindow)
  ipcMain.handle('clipboard:write', (_event, value: string) => clipboard.writeText(value))
  setInterval(() => {
    const value = clipboard.readText()
    if (value && value !== lastClipboard) {
      lastClipboard = value
      clipboardItems = [value, ...clipboardItems.filter(item => item !== value)].slice(0, 10)
      win?.webContents.send('clipboard:update', clipboardItems)
    }
  }, 900)
})

app.on('window-all-closed', () => { /* keep the tray utility running until Quit */ })
app.on('activate', () => { if (!win) createWindow(); else win.showInactive() })
