/**
 * Shared types used by both the Electron main process and the React renderer.
 * Keep this file free of any Node or DOM imports so it can be consumed by both.
 */

export type Category =
  | 'system'
  | 'apps'
  | 'user'
  | 'docker'
  | 'dev'
  | 'media'
  | 'temp'
  | 'other'

export const CATEGORIES: Category[] = [
  'system',
  'apps',
  'user',
  'docker',
  'dev',
  'media',
  'temp',
  'other'
]

export const CATEGORY_LABELS: Record<Category, string> = {
  system: 'System',
  apps: 'Apps',
  user: 'User Data',
  docker: 'Docker',
  dev: 'Dev',
  media: 'Media',
  temp: 'Temp / Cache',
  other: 'Other'
}

/** A node in the scanned folder tree. */
export interface ScanNode {
  /** Absolute path of this entry. */
  path: string
  /** Display name (basename). */
  name: string
  /** Total size in bytes (recursive, including children). */
  size: number
  /** True if this is a directory. */
  isDir: boolean
  /** Resolved category for this node. */
  category: Category
  /** Last modified time as epoch ms (0 if unknown). */
  mtime: number
  /** Number of files contained (recursive). 1 for a file. */
  fileCount: number
  /** Immediate children, largest first. Undefined for files / leaves. */
  children?: ScanNode[]
}

export interface DriveInfo {
  /** e.g. "C:\\" */
  path: string
  /** e.g. "C:" */
  label: string
  total: number
  free: number
  used: number
  /** Optional volume name, if discoverable. */
  volumeName?: string
}

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error' | 'cancelled'

export interface ScanProgress {
  /** Path currently being scanned. */
  path: string
  filesScanned: number
  /** 0..100, may be approximate. -1 means indeterminate. */
  percentDone: number
  /** Bytes counted so far. */
  bytesScanned: number
}

export interface ScanResult {
  root: ScanNode
  drivePath: string
  /** Epoch ms when the scan completed. */
  scannedAt: number
  /** Total time taken in ms. */
  durationMs: number
  filesScanned: number
  /** Paths that were skipped due to permission errors. */
  skipped: number
  /** Per-category byte totals across the whole scan. */
  categoryTotals: Record<Category, number>
}

export interface QuickWin {
  id: string
  label: string
  description: string
  /** Size in bytes. -1 if it could not be determined. */
  size: number
  /** Path to open in Explorer (may be undefined when not openable). */
  path?: string
  /** Icon hint for the renderer. */
  icon:
    | 'temp'
    | 'recycle'
    | 'chrome'
    | 'edge'
    | 'firefox'
    | 'docker'
    | 'update'
    | 'thumbnails'
  /** Whether the underlying app/path was detected as present. */
  available: boolean
}

export interface QuickWins {
  items: QuickWin[]
  /** Sum of all determinable wins, in bytes. */
  total: number
  computedAt: number
}

/** Cached scan metadata persisted to disk. */
export interface CachedScan {
  result: ScanResult
  version: number
}

/** Live system-monitor sample. */
export interface GpuStats {
  name: string
  /** 0..100 utilization. -1 if unknown. */
  util: number
  memUsed: number
  memTotal: number
}

export interface SysStats {
  /** Overall CPU usage 0..100. */
  cpu: number
  /** Per-core usage 0..100. */
  cores: number[]
  memUsed: number
  memTotal: number
  /** First GPU, or null if none detected. */
  gpu: GpuStats | null
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  /** running | exited | created | paused … */
  state: string
  status: string
  /** Writable layer size as reported by docker (e.g. "1.2GB (virtual 3.4GB)"). */
  size: string
}

export interface DockerImage {
  id: string
  repository: string
  tag: string
  size: string
}

export interface DockerDfEntry {
  type: string
  total: string
  active: string
  size: string
  reclaimable: string
}

export interface DockerInfo {
  available: boolean
  version?: string
  error?: string
  containers: DockerContainer[]
  images: DockerImage[]
  df: DockerDfEntry[]
}

export type DockerActionType = 'start' | 'stop' | 'rm' | 'rmi' | 'prune'

/** The API surface exposed on window.spacescope by the preload bridge. */
export interface SpaceScopeApi {
  getDrives(): Promise<DriveInfo[]>
  startScan(drivePath: string): Promise<void>
  cancelScan(): Promise<void>
  getScanResults(): Promise<ScanResult | null>
  getCachedScan(): Promise<ScanResult | null>
  getQuickWins(drivePath: string): Promise<QuickWins>
  openInExplorer(path: string): Promise<{ ok: boolean; error?: string }>
  onScanProgress(cb: (p: ScanProgress) => void): () => void
  onScanComplete(cb: (r: ScanResult) => void): () => void
  onScanError(cb: (message: string) => void): () => void
  getPlatform(): Promise<NodeJS.Platform>
  // Docker management
  getDockerInfo(): Promise<DockerInfo>
  dockerAction(action: DockerActionType, id?: string): Promise<{ ok: boolean; error?: string }>
  // Live system monitor
  onSysStats(cb: (s: SysStats) => void): () => void
}

/** IPC channel names — single source of truth. */
export const IPC = {
  getDrives: 'drives:get',
  startScan: 'scan:start',
  cancelScan: 'scan:cancel',
  getScanResults: 'scan:get-results',
  getCachedScan: 'scan:get-cached',
  getQuickWins: 'quickwins:get',
  openInExplorer: 'shell:open',
  getPlatform: 'app:platform',
  scanProgress: 'scan:progress',
  scanComplete: 'scan:complete',
  scanError: 'scan:error',
  getDockerInfo: 'docker:info',
  dockerAction: 'docker:action',
  sysStats: 'sys:stats'
} as const
