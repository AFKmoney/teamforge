/**
 * TeamForge IDE — Electron Main Process
 *
 * Wraps the Next.js app as a native desktop application.
 * Launches the Next.js dev server and opens a BrowserWindow.
 */

const { app, BrowserWindow, Menu, shell, dialog, Tray, nativeImage } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

// Keep a global reference of the window object
let mainWindow = null
let nextProcess = null
let tray = null
const isDev = !app.isPackaged
const NEXT_PORT = 3000

// Server health check
async function waitForServer(maxRetries = 60, interval = 1500) {
  const http = require('http')
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, interval))
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${NEXT_PORT}`, (res) => {
          resolve(res)
        })
        req.on('error', reject)
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')) })
      })
      return true
    } catch {
      // Server not ready yet
    }
  }
  return false
}

function createTray() {
  // Create a simple green dot tray icon
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" fill="#00e676" stroke="#0d0d0d" stroke-width="1"/>
      </svg>`,
      'utf-8'
    )
  )
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('TeamForge IDE')
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TeamForge IDE',
    backgroundColor: '#0d0d0d',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false, // Show after server is ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Custom application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new-file') },
        { label: 'Open File', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open-file') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
        { label: 'Save All', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu-save-all') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => mainWindow.webContents.send('menu-settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu-find') },
        { label: 'Replace', accelerator: 'CmdOrCtrl+H', click: () => mainWindow.webContents.send('menu-replace') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Terminal',
      submenu: [
        { label: 'New Terminal', accelerator: 'CmdOrCtrl+J', click: () => mainWindow.webContents.send('menu-terminal') },
        { label: 'Clear Terminal', click: () => mainWindow.webContents.send('menu-clear-terminal') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'TeamForge on GitHub',
          click: () => shell.openExternal('https://github.com/AFKmoney/teamforge'),
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://github.com/AFKmoney/teamforge#readme'),
        },
        { type: 'separator' },
        { role: 'about' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.on('close', (e) => {
    e.preventDefault()
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Exit TeamForge IDE',
      message: 'Are you sure you want to exit TeamForge IDE?',
      detail: 'Any unsaved changes will be preserved in your project.',
      buttons: ['Exit', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    }).then(({ response }) => {
      if (response === 0) {
        if (nextProcess) {
          nextProcess.kill()
        }
        mainWindow.destroy()
        app.quit()
      }
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function startNextServer() {
  const projectRoot = isDev
    ? path.join(__dirname, '..')
    : path.join(process.resourcesPath, 'app')

  return new Promise((resolve, reject) => {
    const bunPath = process.platform === 'win32' ? 'bun.exe' : 'bun'

    nextProcess = spawn(bunPath, ['run', 'dev'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PORT: String(NEXT_PORT),
        NODE_ENV: isDev ? 'development' : 'production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Ready') || output.includes('started')) {
        resolve(true)
      }
    })

    nextProcess.stderr.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Ready') || output.includes('started')) {
        resolve(true)
      }
    })

    nextProcess.on('error', (err) => {
      console.error('Failed to start Next.js server:', err)
      reject(err)
    })

    nextProcess.on('close', (code) => {
      console.log(`Next.js server exited with code ${code}`)
      nextProcess = null
    })
  })
}

// App lifecycle
app.whenReady().then(async () => {
  createWindow()
  createTray()

  // Start Next.js server
  try {
    if (isDev) {
      const serverReady = await waitForServer(3, 1000)
      if (!serverReady) {
        await startNextServer()
        await waitForServer(60, 1500)
      }
    } else {
      await startNextServer()
      await waitForServer(60, 1500)
    }
  } catch (err) {
    console.error('Failed to start server:', err)
  }

  // Load the app
  mainWindow.loadURL(`http://localhost:${NEXT_PORT}`)
  mainWindow.show()
  mainWindow.focus()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  dialog.showErrorBox('TeamForge IDE Error', error.message)
})
