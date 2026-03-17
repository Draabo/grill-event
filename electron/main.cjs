const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

const isDev = !app.isPackaged

function getSavestatePath() {
  if (isDev) {
    return path.join(__dirname, '..', 'savestate')
  }
  return path.join(app.getPath('userData'), 'savestate')
}

function ensureSavestateDir() {
  const dir = getSavestatePath()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    backgroundColor: '#1a1a1a',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('load-events', async () => {
    try {
      const dir = ensureSavestateDir()
      const filePath = path.join(dir, 'events.json')
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (err) {
      console.error('Failed to load events:', err)
    }
    return { events: [] }
  })

  ipcMain.handle('save-events', async (_event, data) => {
    try {
      const dir = ensureSavestateDir()
      const filePath = path.join(dir, 'events.json')
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true }
    } catch (err) {
      console.error('Failed to save events:', err)
      return { success: false }
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
