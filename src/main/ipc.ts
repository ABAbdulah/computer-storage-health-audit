import { ipcMain, shell, BrowserWindow } from 'electron'
import { exec } from 'node:child_process'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { IPC, type DockerActionType, type ScanResult } from '@shared/types'
import { getDrives } from './drives'
import { getQuickWins } from './quickwins'
import { ScanManager } from './scanner'
import { getDockerInfo, dockerAction } from './docker'
import { cleanPaths, cleanQuickWin } from './clean'

const scanManager = new ScanManager()

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerIpcHandlers(): void {
  // Warm the in-memory cache from disk on startup.
  void scanManager.loadCache()

  ipcMain.handle(IPC.getDrives, async () => {
    return getDrives()
  })

  ipcMain.handle(IPC.getPlatform, async () => process.platform)

  ipcMain.handle(IPC.startScan, async (_e, drivePath: string) => {
    // Determine used bytes for an accurate progress percentage.
    let usedBytes = 0
    try {
      const drives = await getDrives()
      const match = drives.find((d) => drivePath.toUpperCase().startsWith(d.label.toUpperCase()))
      usedBytes = match ? match.used : 0
    } catch {
      /* progress will be indeterminate */
    }

    await scanManager.start(drivePath, usedBytes, {
      onProgress: (p) => broadcast(IPC.scanProgress, p),
      onComplete: (r: ScanResult) => broadcast(IPC.scanComplete, r),
      onError: (message) => broadcast(IPC.scanError, message)
    })
  })

  ipcMain.handle(IPC.cancelScan, async () => {
    await scanManager.cancel()
  })

  ipcMain.handle(IPC.getScanResults, async () => scanManager.getLastResult())

  ipcMain.handle(IPC.getCachedScan, async () => {
    return scanManager.getLastResult() ?? (await scanManager.loadCache())
  })

  ipcMain.handle(IPC.getQuickWins, async (_e, drivePath: string) => {
    return getQuickWins(drivePath || 'C:\\')
  })

  ipcMain.handle(IPC.openInExplorer, async (_e, target: string) => {
    try {
      if (!target) return { ok: false, error: 'No path provided' }
      // Virtual shell folders (e.g. Recycle Bin) must go through explorer.exe.
      if (target.startsWith('shell:')) {
        exec(`explorer.exe ${target}`, { windowsHide: true })
        return { ok: true }
      }

      const normalized = path.normalize(target)

      // Decide how to reveal it: open directories directly; select files in
      // their containing folder.
      let isDir = false
      let exists = true
      try {
        isDir = (await fsp.stat(normalized)).isDirectory()
      } catch {
        exists = false
      }

      if (!exists) {
        // The path may have been deleted since the scan, or be a synthetic
        // bucket — fall back to the nearest existing ancestor directory.
        let dir = path.dirname(normalized)
        for (let i = 0; i < 6; i++) {
          try {
            await fsp.access(dir)
            break
          } catch {
            const parent = path.dirname(dir)
            if (parent === dir) break
            dir = parent
          }
        }
        const err = await shell.openPath(dir)
        return err ? { ok: false, error: err } : { ok: true }
      }

      if (isDir) {
        const err = await shell.openPath(normalized)
        if (err) {
          shell.showItemInFolder(normalized)
        }
        return { ok: true }
      }

      // It's a file — reveal & select it in Explorer.
      shell.showItemInFolder(normalized)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle(IPC.getDockerInfo, async () => getDockerInfo())

  ipcMain.handle(IPC.dockerAction, async (_e, action: DockerActionType, id?: string) => {
    return dockerAction(action, id)
  })

  ipcMain.handle(IPC.cleanPaths, async (_e, paths: string[]) => {
    return cleanPaths(Array.isArray(paths) ? paths : [])
  })

  ipcMain.handle(IPC.cleanQuickWin, async (_e, id: string, p?: string) => {
    return cleanQuickWin(id, p)
  })
}

export async function disposeIpc(): Promise<void> {
  await scanManager.cancel()
}
