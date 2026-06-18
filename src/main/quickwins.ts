import { promises as fsp, type Dirent } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { QuickWin, QuickWins } from '@shared/types'

function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.length ? v : undefined
}

const LOCALAPPDATA = env('LOCALAPPDATA') || path.join(os.homedir(), 'AppData', 'Local')
const APPDATA = env('APPDATA') || path.join(os.homedir(), 'AppData', 'Roaming')
const SYSTEMROOT = env('SystemRoot') || env('windir') || 'C:\\Windows'
const USERTEMP = env('TEMP') || path.join(LOCALAPPDATA, 'Temp')

async function exists(p: string): Promise<boolean> {
  try {
    await fsp.access(p)
    return true
  } catch {
    return false
  }
}

async function fileSize(p: string): Promise<number> {
  try {
    return (await fsp.stat(p)).size
  } catch {
    return 0
  }
}

/** Recursive directory size with bounded concurrency; skips errors silently. */
async function dirSize(p: string, depth = 0): Promise<number> {
  if (depth > 24) return 0
  let entries: Dirent[]
  try {
    entries = await fsp.readdir(p, { withFileTypes: true })
  } catch {
    return 0
  }
  let total = 0
  const dirs: string[] = []
  const files: string[] = []
  for (const e of entries) {
    if (e.isSymbolicLink()) continue
    if (e.isDirectory()) dirs.push(path.join(p, e.name))
    else if (e.isFile()) files.push(path.join(p, e.name))
  }
  // Files
  await pool(files, 24, async (fp) => {
    total += await fileSize(fp)
  })
  // Dirs
  await pool(dirs, 8, async (dp) => {
    total += await dirSize(dp, depth + 1)
  })
  return total
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  const workers = new Array(Math.min(limit, items.length || 1)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx])
    }
  })
  await Promise.all(workers)
}

async function firstExistingDir(candidates: string[]): Promise<string | undefined> {
  for (const c of candidates) if (await exists(c)) return c
  return undefined
}

/** Sum the sizes of all matching cache2 dirs across Firefox profiles. */
async function firefoxCacheSize(): Promise<{ size: number; path?: string }> {
  const profilesRoot = path.join(LOCALAPPDATA, 'Mozilla', 'Firefox', 'Profiles')
  if (!(await exists(profilesRoot))) return { size: 0 }
  let entries: Dirent[]
  try {
    entries = await fsp.readdir(profilesRoot, { withFileTypes: true })
  } catch {
    return { size: 0 }
  }
  let total = 0
  let firstPath: string | undefined
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const cacheDir = path.join(profilesRoot, e.name, 'cache2')
    if (await exists(cacheDir)) {
      if (!firstPath) firstPath = cacheDir
      total += await dirSize(cacheDir)
    }
  }
  return { size: total, path: firstPath }
}

/** Locate WSL2 / Docker Desktop virtual disks and sum their sizes. */
async function dockerVhdx(): Promise<{ size: number; path?: string }> {
  const candidates = [
    path.join(LOCALAPPDATA, 'Docker', 'wsl', 'disk', 'docker_data.vhdx'),
    path.join(LOCALAPPDATA, 'Docker', 'wsl', 'data', 'ext4.vhdx'),
    path.join(LOCALAPPDATA, 'Docker', 'wsl', 'main', 'ext4.vhdx')
  ]
  let total = 0
  let firstPath: string | undefined
  for (const c of candidates) {
    const s = await fileSize(c)
    if (s > 0) {
      total += s
      if (!firstPath) firstPath = path.dirname(c)
    }
  }
  // WSL distro disks live under %LOCALAPPDATA%\Packages\*\LocalState\ext4.vhdx
  const packages = path.join(LOCALAPPDATA, 'Packages')
  if (await exists(packages)) {
    try {
      const pkgs = await fsp.readdir(packages, { withFileTypes: true })
      for (const e of pkgs) {
        if (!e.isDirectory()) continue
        const name = e.name.toLowerCase()
        if (!/ubuntu|debian|wsl|canonical|kali|suse|oracle|docker/.test(name)) continue
        const disk = path.join(packages, e.name, 'LocalState', 'ext4.vhdx')
        const s = await fileSize(disk)
        if (s > 0) {
          total += s
          if (!firstPath) firstPath = path.dirname(disk)
        }
      }
    } catch {
      /* ignore */
    }
  }
  return { size: total, path: firstPath }
}

export async function getQuickWins(drivePath: string): Promise<QuickWins> {
  const driveLetter = (drivePath.match(/^[A-Za-z]:/)?.[0] || 'C:').toUpperCase()

  const chromeCache = path.join(LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Cache')
  const chromeRoot = path.join(LOCALAPPDATA, 'Google', 'Chrome', 'User Data')
  const edgeCache = path.join(LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache')
  const edgeRoot = path.join(LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data')
  const recycleBin = `${driveLetter}\\$Recycle.Bin`
  const winUpdate = path.join(SYSTEMROOT, 'SoftwareDistribution', 'Download')
  const winTemp = path.join(SYSTEMROOT, 'Temp')
  const thumbnails = path.join(LOCALAPPDATA, 'Microsoft', 'Windows', 'Explorer')

  const [
    userTempSize,
    winTempSize,
    recycleSize,
    chromeInstalled,
    chromeSize,
    edgeInstalled,
    edgeSize,
    firefox,
    docker,
    winUpdateSize,
    thumbSize
  ] = await Promise.all([
    dirSize(USERTEMP),
    dirSize(winTemp),
    dirSize(recycleBin),
    exists(chromeRoot),
    exists(chromeCache).then((e) => (e ? dirSize(chromeCache) : 0)),
    exists(edgeRoot),
    exists(edgeCache).then((e) => (e ? dirSize(edgeCache) : 0)),
    firefoxCacheSize(),
    dockerVhdx(),
    exists(winUpdate).then((e) => (e ? dirSize(winUpdate) : -1)),
    thumbnailsSize(thumbnails)
  ])

  const items: QuickWin[] = [
    {
      id: 'temp',
      label: 'Temporary files',
      description: 'User & Windows temp folders — safe to clear',
      size: userTempSize + Math.max(0, winTempSize),
      path: USERTEMP,
      icon: 'temp',
      available: true
    },
    {
      id: 'recycle',
      label: 'Recycle Bin',
      description: `Deleted items still occupying ${driveLetter}`,
      size: recycleSize,
      path: 'shell:RecycleBinFolder',
      icon: 'recycle',
      available: true
    },
    {
      id: 'chrome',
      label: 'Chrome cache',
      description: chromeInstalled ? 'Cached web data for Google Chrome' : 'Chrome not detected',
      size: chromeInstalled ? chromeSize : -1,
      path: chromeInstalled ? path.join(chromeRoot, 'Default', 'Cache') : undefined,
      icon: 'chrome',
      available: chromeInstalled
    },
    {
      id: 'edge',
      label: 'Edge cache',
      description: edgeInstalled ? 'Cached web data for Microsoft Edge' : 'Edge not detected',
      size: edgeInstalled ? edgeSize : -1,
      path: edgeInstalled ? path.join(edgeRoot, 'Default', 'Cache') : undefined,
      icon: 'edge',
      available: edgeInstalled
    },
    {
      id: 'firefox',
      label: 'Firefox cache',
      description: firefox.path ? 'Cached web data across Firefox profiles' : 'Firefox not detected',
      size: firefox.path ? firefox.size : -1,
      path: firefox.path,
      icon: 'firefox',
      available: !!firefox.path
    },
    {
      id: 'docker',
      label: 'Docker / WSL disks',
      description: docker.path
        ? 'Virtual disk images (ext4.vhdx) — reclaim with docker prune'
        : 'No Docker / WSL disks found',
      size: docker.path ? docker.size : -1,
      path: docker.path,
      icon: 'docker',
      available: !!docker.path
    },
    {
      id: 'winupdate',
      label: 'Windows Update cache',
      description:
        winUpdateSize >= 0
          ? 'Downloaded update packages (SoftwareDistribution)'
          : 'Requires elevated access to measure',
      size: winUpdateSize,
      path: winUpdate,
      icon: 'update',
      available: winUpdateSize >= 0
    },
    {
      id: 'thumbnails',
      label: 'Thumbnail cache',
      description: 'Explorer thumbnail database files',
      size: thumbSize,
      path: thumbnails,
      icon: 'thumbnails',
      available: thumbSize > 0
    }
  ]

  const total = items.reduce((s, w) => (w.size > 0 ? s + w.size : s), 0)
  return { items, total, computedAt: Date.now() }
}

async function thumbnailsSize(explorerDir: string): Promise<number> {
  if (!(await exists(explorerDir))) return 0
  try {
    const entries = await fsp.readdir(explorerDir, { withFileTypes: true })
    let total = 0
    for (const e of entries) {
      if (e.isFile() && /^(thumbcache|iconcache).*\.db$/i.test(e.name)) {
        total += await fileSize(path.join(explorerDir, e.name))
      }
    }
    return total
  } catch {
    return 0
  }
}
