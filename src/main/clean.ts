import { promises as fsp } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { CleanResult } from '@shared/types'

const execAsync = promisify(exec)
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
const SYSTEMROOT = process.env.SystemRoot || process.env.windir || 'C:\\Windows'

/**
 * Folder basenames that are safe to clear — caches and temp that applications
 * regenerate automatically. This is an allow-list: anything not matching is
 * rejected, no matter what the renderer sends.
 */
const SAFE_NAMES = new Set([
  'cache',
  'cache_data',
  'caches',
  'code cache',
  'gpucache',
  'dawncache',
  'dawngraphitecache',
  'dawnwebgpucache',
  'grshadercache',
  'shadercache',
  'cache2',
  'crashpad',
  'crashdumps',
  'temp',
  'tmp',
  'logs',
  'blob_storage',
  'component_crx_cache'
])

/** Paths that must never be touched, even if a parent name looks cache-like. */
const BLOCK =
  /(local storage|indexeddb|cookies|login data|[\\/]network[\\/]|databases|leveldb|sync data|web data|bookmarks|[\\/]documents[\\/]|[\\/]desktop[\\/]|[\\/]pictures[\\/]|[\\/]downloads[\\/]|\.vhdx)/i

/**
 * The authoritative safety check. A path is clearable only if it is an
 * absolute, sufficiently-deep directory whose own name is an allow-listed
 * cache/temp name (or it is a *\Temp folder), and it matches no block pattern.
 */
export function isSafeCachePath(p: string): boolean {
  if (typeof p !== 'string' || !/^[A-Za-z]:[\\/]/.test(p)) return false
  const norm = p.replace(/[\\/]+$/, '')
  if (BLOCK.test(norm)) return false
  const parts = norm.split(/[\\/]/).filter(Boolean)
  if (parts.length < 3) return false // never the drive root or a top-level folder
  const base = (parts[parts.length - 1] || '').toLowerCase()
  return SAFE_NAMES.has(base) || /[\\/]temp$/i.test(norm)
}

async function driveFree(drive: string): Promise<number> {
  try {
    const s = await fsp.statfs(drive)
    return s.bavail * s.bsize
  } catch {
    return 0
  }
}

/** Delete the contents of a directory (keep the folder); ignore locked items. */
async function clearContents(dir: string): Promise<boolean> {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true })
    await Promise.all(
      entries.map((e) =>
        fsp.rm(path.join(dir, e.name), { recursive: true, force: true }).catch(() => undefined)
      )
    )
    return true
  } catch {
    return false
  }
}

/**
 * Clean a single Quick Win by id. Only the safe, well-known ids are honored;
 * Docker and Windows Update are intentionally not handled here. Each branch
 * targets a specific, regenerable cache/temp location.
 */
export async function cleanQuickWin(id: string, targetPath?: string): Promise<CleanResult> {
  const driveRoot = (targetPath?.match(/^[A-Za-z]:[\\/]/)?.[0] ?? 'C:\\').slice(0, 3)
  const before = await driveFree(driveRoot)
  let cleared = 0
  let failed = 0

  try {
    switch (id) {
      case 'recycle': {
        // Empty the Recycle Bin (permanent — but that's exactly the intent).
        await execAsync(
          'powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"',
          { windowsHide: true, timeout: 30000 }
        ).catch(() => undefined)
        cleared = 1
        break
      }
      case 'thumbnails': {
        const dir = path.join(LOCALAPPDATA, 'Microsoft', 'Windows', 'Explorer')
        const files = await fsp.readdir(dir).catch(() => [] as string[])
        await Promise.all(
          files
            .filter((f) => /^(thumbcache|iconcache).*\.db$/i.test(f))
            .map((f) => fsp.rm(path.join(dir, f), { force: true }).catch(() => undefined))
        )
        cleared = 1
        break
      }
      case 'temp': {
        // User temp + Windows temp, both validated.
        for (const d of [targetPath, path.join(SYSTEMROOT, 'Temp')]) {
          if (d && isSafeCachePath(d)) {
            if (await clearContents(d)) cleared++
          }
        }
        if (cleared === 0) failed = 1
        break
      }
      case 'chrome':
      case 'edge':
      case 'firefox': {
        if (targetPath && isSafeCachePath(targetPath)) {
          if (await clearContents(targetPath)) cleared = 1
          else failed = 1
        } else {
          failed = 1
        }
        break
      }
      default:
        // Not a cleanable Quick Win (e.g. docker, winupdate).
        failed = 1
    }
  } catch {
    failed = 1
  }

  const after = await driveFree(driveRoot)
  return { freedBytes: Math.max(0, after - before), cleared, failed }
}

/**
 * Permanently delete the CONTENTS of each validated cache folder (the folder
 * itself is kept so apps recreate it cleanly). Returns bytes freed on the drive.
 */
export async function cleanPaths(paths: string[]): Promise<CleanResult> {
  const valid = [...new Set(paths)].filter(isSafeCachePath)
  if (valid.length === 0) {
    return { freedBytes: 0, cleared: 0, failed: paths.length }
  }

  const driveRoot = valid[0].slice(0, 3) // e.g. "C:\"
  const before = await driveFree(driveRoot)

  let cleared = 0
  let failed = 0
  for (const p of valid) {
    try {
      const stat = await fsp.stat(p)
      if (!stat.isDirectory()) {
        failed++
        continue
      }
      const entries = await fsp.readdir(p, { withFileTypes: true })
      // Remove each child; ignore individually locked/in-use items.
      await Promise.all(
        entries.map((e) =>
          fsp.rm(path.join(p, e.name), { recursive: true, force: true }).catch(() => undefined)
        )
      )
      cleared++
    } catch {
      failed++
    }
  }

  const after = await driveFree(driveRoot)
  return { freedBytes: Math.max(0, after - before), cleared, failed: failed + (paths.length - valid.length) }
}
