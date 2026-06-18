import { app, BrowserWindow, shell, nativeTheme, session } from 'electron'
import path from 'node:path'
import { registerIpcHandlers, disposeIpc } from './ipc'
import { startSysMon, stopSysMon } from './sysmon'

const isDev = !app.isPackaged

/** Lock the renderer down with a Content-Security-Policy in production. */
function applyCsp(): void {
  if (isDev) return
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
        ]
      }
    })
  })
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 940,
    minHeight: 640,
    show: false,
    backgroundColor: '#0A0A0F',
    title: 'SpaceScope',
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => win.show())

  // Open external links in the user's browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Respect OS theme as the initial source for nativeTheme-driven chrome.
  nativeTheme.themeSource = 'system'
  applyCsp()
  registerIpcHandlers()
  createWindow()
  startSysMon()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    void disposeIpc().finally(() => app.quit())
  }
})

app.on('before-quit', () => {
  stopSysMon()
  void disposeIpc()
})
