import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type CleanResult,
  type DockerActionType,
  type DockerInfo,
  type DriveInfo,
  type QuickWins,
  type ScanProgress,
  type ScanResult,
  type SpaceScopeApi,
  type SysStats
} from '@shared/types'

const api: SpaceScopeApi = {
  getDrives: () => ipcRenderer.invoke(IPC.getDrives) as Promise<DriveInfo[]>,
  startScan: (drivePath: string) => ipcRenderer.invoke(IPC.startScan, drivePath) as Promise<void>,
  cancelScan: () => ipcRenderer.invoke(IPC.cancelScan) as Promise<void>,
  getScanResults: () => ipcRenderer.invoke(IPC.getScanResults) as Promise<ScanResult | null>,
  getCachedScan: () => ipcRenderer.invoke(IPC.getCachedScan) as Promise<ScanResult | null>,
  getQuickWins: (drivePath: string) =>
    ipcRenderer.invoke(IPC.getQuickWins, drivePath) as Promise<QuickWins>,
  openInExplorer: (p: string) =>
    ipcRenderer.invoke(IPC.openInExplorer, p) as Promise<{ ok: boolean; error?: string }>,
  getPlatform: () => ipcRenderer.invoke(IPC.getPlatform) as Promise<NodeJS.Platform>,

  onScanProgress: (cb: (p: ScanProgress) => void) => {
    const handler = (_e: unknown, p: ScanProgress): void => cb(p)
    ipcRenderer.on(IPC.scanProgress, handler)
    return () => ipcRenderer.removeListener(IPC.scanProgress, handler)
  },
  onScanComplete: (cb: (r: ScanResult) => void) => {
    const handler = (_e: unknown, r: ScanResult): void => cb(r)
    ipcRenderer.on(IPC.scanComplete, handler)
    return () => ipcRenderer.removeListener(IPC.scanComplete, handler)
  },
  onScanError: (cb: (message: string) => void) => {
    const handler = (_e: unknown, m: string): void => cb(m)
    ipcRenderer.on(IPC.scanError, handler)
    return () => ipcRenderer.removeListener(IPC.scanError, handler)
  },

  getDockerInfo: () => ipcRenderer.invoke(IPC.getDockerInfo) as Promise<DockerInfo>,
  dockerAction: (action: DockerActionType, id?: string) =>
    ipcRenderer.invoke(IPC.dockerAction, action, id) as Promise<{ ok: boolean; error?: string }>,

  onSysStats: (cb: (s: SysStats) => void) => {
    const handler = (_e: unknown, s: SysStats): void => cb(s)
    ipcRenderer.on(IPC.sysStats, handler)
    return () => ipcRenderer.removeListener(IPC.sysStats, handler)
  },

  cleanPaths: (paths: string[]) => ipcRenderer.invoke(IPC.cleanPaths, paths) as Promise<CleanResult>,
  cleanQuickWin: (id: string, p?: string) =>
    ipcRenderer.invoke(IPC.cleanQuickWin, id, p) as Promise<CleanResult>
}

contextBridge.exposeInMainWorld('spacescope', api)
