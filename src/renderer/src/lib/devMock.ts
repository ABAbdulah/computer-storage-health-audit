import type {
  DriveInfo,
  QuickWins,
  ScanNode,
  ScanResult,
  SpaceScopeApi,
  Category,
  DockerInfo,
  SysStats
} from '@shared/types'
import { CATEGORIES } from '@shared/types'

/**
 * A fake `window.spacescope` used only when the real preload bridge is absent
 * (i.e. the renderer is opened in a plain browser for design work). In a real
 * Electron build this never runs — `window.spacescope` is always defined.
 */
const GB = 1024 * 1024 * 1024

function n(
  name: string,
  size: number,
  category: Category,
  isDir = true,
  children?: ScanNode[]
): ScanNode {
  return {
    path: `C:\\${name}`,
    name,
    size,
    isDir,
    category,
    mtime: Date.now() - Math.random() * 1e10,
    fileCount: isDir ? Math.floor(size / 50000) : 1,
    children
  }
}

const sampleRoot: ScanNode = {
  path: 'C:\\',
  name: 'C:\\',
  size: 372 * GB,
  isDir: true,
  category: 'other',
  mtime: Date.now(),
  fileCount: 1_240_553,
  children: [
    n('Windows', 64 * GB, 'system', true, [
      n('WinSxS', 9.2 * GB, 'system'),
      n('System32', 6.4 * GB, 'system'),
      n('SoftwareDistribution', 4.1 * GB, 'temp'),
      n('Temp', 1.3 * GB, 'temp')
    ]),
    n('ext4.vhdx (Docker / WSL)', 48 * GB, 'docker', false),
    n('Program Files', 39 * GB, 'apps', true, [
      n('Microsoft Visual Studio', 12 * GB, 'apps'),
      n('Adobe', 8.7 * GB, 'apps'),
      n('Common Files', 3.1 * GB, 'apps')
    ]),
    n('Users', 121 * GB, 'user', true, [
      n('Downloads', 34 * GB, 'user', true, [
        n('ubuntu-24.04.iso', 5.6 * GB, 'media', false),
        n('dataset.zip', 4.2 * GB, 'other', false),
        n('Smaller files & folders', 24.2 * GB, 'user')
      ]),
      n('Videos', 41 * GB, 'media', true, [
        n('screen-recording-final.mp4', 8.1 * GB, 'media', false),
        n('demo-4k.mkv', 6.7 * GB, 'media', false),
        n('Smaller files & folders', 26.2 * GB, 'media')
      ]),
      n('Documents', 18 * GB, 'user'),
      n('AppData', 28 * GB, 'temp', true, [
        n('Local\\Google\\Chrome cache', 3.4 * GB, 'temp'),
        n('Local\\Microsoft\\Edge cache', 2.1 * GB, 'temp'),
        n('Local\\Temp', 5.9 * GB, 'temp'),
        n('Smaller files & folders', 16.6 * GB, 'temp')
      ])
    ]),
    n('dev', 52 * GB, 'dev', true, [
      n('node_modules', 23 * GB, 'dev'),
      n('.git', 9 * GB, 'dev'),
      n('.next', 4 * GB, 'dev'),
      n('Smaller files & folders', 16 * GB, 'dev')
    ]),
    n('ProgramData', 14 * GB, 'apps'),
    n('Smaller files & folders', 34 * GB, 'other')
  ]
}

const categoryTotals = CATEGORIES.reduce((a, c) => ((a[c] = 0), a), {} as Record<Category, number>)
function tally(node: ScanNode): void {
  if (!node.children) {
    categoryTotals[node.category] += node.size
    return
  }
  node.children.forEach(tally)
}
sampleRoot.children!.forEach(tally)

const sampleResult: ScanResult = {
  root: sampleRoot,
  drivePath: 'C:\\',
  scannedAt: Date.now() - 1000 * 60 * 12,
  durationMs: 48230,
  filesScanned: 1_240_553,
  skipped: 1847,
  categoryTotals
}

const drives: DriveInfo[] = [
  { path: 'C:\\', label: 'C:', total: 476 * GB, free: 104 * GB, used: 372 * GB, volumeName: 'OS' },
  { path: 'D:\\', label: 'D:', total: 1024 * GB, free: 712 * GB, used: 312 * GB, volumeName: 'Data' }
]

const quickWins: QuickWins = {
  computedAt: Date.now(),
  total: 18.7 * GB,
  items: [
    { id: 'temp', label: 'Temporary files', description: 'User & Windows temp folders — safe to clear', size: 5.9 * GB, path: 'C:\\Temp', icon: 'temp', available: true },
    { id: 'recycle', label: 'Recycle Bin', description: 'Deleted items still occupying C:', size: 3.2 * GB, path: 'shell:RecycleBinFolder', icon: 'recycle', available: true },
    { id: 'chrome', label: 'Chrome cache', description: 'Cached web data for Google Chrome', size: 3.4 * GB, path: 'C:\\chrome', icon: 'chrome', available: true },
    { id: 'edge', label: 'Edge cache', description: 'Cached web data for Microsoft Edge', size: 2.1 * GB, path: 'C:\\edge', icon: 'edge', available: true },
    { id: 'firefox', label: 'Firefox cache', description: 'Firefox not detected', size: -1, icon: 'firefox', available: false },
    { id: 'docker', label: 'Docker / WSL disks', description: 'Virtual disk images (ext4.vhdx)', size: 48 * GB, path: 'C:\\docker', icon: 'docker', available: true },
    { id: 'winupdate', label: 'Windows Update cache', description: 'Downloaded update packages', size: 4.1 * GB, path: 'C:\\win', icon: 'update', available: true },
    { id: 'thumbnails', label: 'Thumbnail cache', description: 'Explorer thumbnail database files', size: 0.18 * GB, path: 'C:\\thumbs', icon: 'thumbnails', available: true }
  ]
}

const dockerInfo: DockerInfo = {
  available: true,
  version: '27.1.1',
  containers: [
    { id: 'a1b2c3d4e5f6', name: 'postgres-dev', image: 'postgres:16', state: 'running', status: 'Up 3 hours', size: '63.2MB (virtual 438MB)' },
    { id: 'b2c3d4e5f6a1', name: 'redis-cache', image: 'redis:7-alpine', state: 'running', status: 'Up 3 hours', size: '0B (virtual 41MB)' },
    { id: 'c3d4e5f6a1b2', name: 'old-api-build', image: 'myapp/api:legacy', state: 'exited', status: 'Exited (0) 6 days ago', size: '1.2GB (virtual 3.4GB)' },
    { id: 'd4e5f6a1b2c3', name: 'nginx-proxy', image: 'nginx:latest', state: 'running', status: 'Up 3 hours', size: '2.1kB (virtual 188MB)' }
  ],
  images: [
    { id: 'img1', repository: 'postgres', tag: '16', size: '438MB' },
    { id: 'img2', repository: 'myapp/api', tag: 'legacy', size: '3.4GB' },
    { id: 'img3', repository: '<none>', tag: '<none>', size: '1.1GB' }
  ],
  df: [
    { type: 'Images', total: '12', active: '4', size: '14.2GB', reclaimable: '8.1GB (57%)' },
    { type: 'Containers', total: '4', active: '3', size: '1.3GB', reclaimable: '1.2GB (92%)' },
    { type: 'Local Volumes', total: '6', active: '2', size: '22.4GB', reclaimable: '18.9GB (84%)' },
    { type: 'Build Cache', total: '48', active: '0', size: '4.0GB', reclaimable: '4.0GB' }
  ]
}

export function installDevMock(): void {
  if (typeof window === 'undefined' || window.spacescope) return
  let progressTimer: ReturnType<typeof setInterval> | null = null
  const mock: SpaceScopeApi = {
    getDrives: async () => drives,
    getPlatform: async () => 'win32',
    startScan: async () => {
      let pct = 0
      const cb = (window as any).__onProgress as ((p: any) => void) | undefined
      progressTimer = setInterval(() => {
        pct += 12
        cb?.({ path: 'C:\\Users\\you\\AppData\\Local\\Temp', filesScanned: pct * 9000, bytesScanned: (pct / 100) * 372 * GB, percentDone: Math.min(99, pct) })
        if (pct >= 100 && progressTimer) {
          clearInterval(progressTimer)
          ;(window as any).__onComplete?.(sampleResult)
        }
      }, 350)
    },
    cancelScan: async () => {
      if (progressTimer) clearInterval(progressTimer)
    },
    getScanResults: async () => sampleResult,
    getCachedScan: async () => sampleResult,
    getQuickWins: async () => quickWins,
    openInExplorer: async (p: string) => {
      // eslint-disable-next-line no-console
      console.log('[devMock] openInExplorer', p)
      return { ok: true }
    },
    onScanProgress: (cb) => {
      ;(window as any).__onProgress = cb
      return () => undefined
    },
    onScanComplete: (cb) => {
      ;(window as any).__onComplete = cb
      return () => undefined
    },
    onScanError: () => () => undefined,

    getDockerInfo: async () => dockerInfo,
    dockerAction: async (action, id) => {
      // eslint-disable-next-line no-console
      console.log('[devMock] dockerAction', action, id)
      return { ok: true }
    },
    onSysStats: (cb: (s: SysStats) => void) => {
      let cpu = 24
      let gpu = 12
      const cores = Array.from({ length: 8 }, () => 20)
      const timer = setInterval(() => {
        cpu = Math.max(3, Math.min(98, cpu + (Math.random() - 0.5) * 26))
        gpu = Math.max(0, Math.min(96, gpu + (Math.random() - 0.5) * 22))
        const used = (9.2 + Math.random() * 2) * GB
        cb({
          cpu,
          cores: cores.map((c) => Math.max(2, Math.min(100, c + (Math.random() - 0.5) * 40))),
          memUsed: used,
          memTotal: 16 * GB,
          gpu: { name: 'NVIDIA RTX 4070', util: gpu, memUsed: (3.1 + Math.random()) * GB, memTotal: 12 * GB }
        })
      }, 1500)
      return () => clearInterval(timer)
    }
  }
  ;(window as any).spacescope = mock
}
