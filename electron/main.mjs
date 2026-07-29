#!/usr/bin/env node
/**
 * Prepilo Electron shell — study UI only.
 * Desktop lock stays on GTK (prepilo-lock); do not replace it with Electron.
 */
import { app, BrowserWindow, shell } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const API = 'http://127.0.0.1:4789'
const WEB_DEV = 'http://127.0.0.1:5173'
const isDev =
  !app.isPackaged &&
  process.env.PREPILO_ELECTRON_PROD !== '1' &&
  process.env.PREPDESK_ELECTRON_PROD !== '1'

let mainWindow = null
let runnerProc = null

function waitHttp(url, tries = 80, delayMs = 250) {
  return new Promise((resolve) => {
    let left = tries
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve(true)
      })
      req.on('error', () => {
        left -= 1
        if (left <= 0) resolve(false)
        else setTimeout(tick, delayMs)
      })
    }
    tick()
  })
}

function resolveRunner() {
  const candidates = [
    path.join(ROOT, 'server', 'runner.mjs'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'server', 'runner.mjs'),
    path.join(process.resourcesPath || '', 'server', 'runner.mjs'),
    path.join(app.getAppPath(), 'server', 'runner.mjs'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

function resolveDistIndex() {
  const candidates = [
    path.join(ROOT, 'dist', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'dist', 'index.html'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

async function ensureRunner() {
  const ok = await waitHttp(`${API}/health`, 3, 100)
  if (ok) return

  const runner = resolveRunner()
  if (!runner) {
    console.error('Prepilo runner.mjs not found')
    return
  }

  const cwd = path.dirname(path.dirname(runner))
  if (
    app.isPackaged ||
    process.env.PREPILO_ELECTRON_PROD === '1' ||
    process.env.PREPDESK_ELECTRON_PROD === '1'
  ) {
    runnerProc = spawn(process.execPath, [runner], {
      cwd,
      stdio: 'ignore',
      detached: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    })
  } else {
    runnerProc = spawn('npm', ['run', 'runner'], {
      cwd: fs.existsSync(path.join(ROOT, 'package.json')) ? ROOT : cwd,
      stdio: 'ignore',
      detached: true,
      env: process.env,
    })
  }
  runnerProc.unref()
  const ready = await waitHttp(`${API}/health`, 90, 300)
  if (!ready) console.error('Prepilo runner failed to start on :4789')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Prepilo',
    icon: path.join(__dirname, 'icons', 'icon.png'),
    backgroundColor: '#07080a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    void mainWindow.loadURL(WEB_DEV)
  } else {
    const indexHtml = resolveDistIndex()
    if (!indexHtml) {
      void mainWindow.loadURL(
        `data:text/html,<h1 style="font-family:sans-serif;padding:2rem;color:#e8eaef;background:#07080a">Prepilo UI missing — rebuild with <code>npm run dist</code></h1>`,
      )
    } else {
      void mainWindow.loadFile(indexHtml)
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  await ensureRunner()
  if (isDev) {
    const webOk = await waitHttp(WEB_DEV, 3, 100)
    if (!webOk) {
      console.warn('Vite not reachable at 127.0.0.1:5173 — start with: npm run electron:dev')
    }
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
