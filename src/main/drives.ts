import { promises as fsp } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { DriveInfo } from '@shared/types'

const execAsync = promisify(exec)

/** Enumerate available drives with total / free / used space. */
export async function getDrives(): Promise<DriveInfo[]> {
  if (process.platform === 'win32') {
    return getWindowsDrives()
  }
  return getPosixDrives()
}

async function statfsDrive(rootPath: string): Promise<DriveInfo | null> {
  try {
    // Node's statfs gives block counts; multiply by block size for bytes.
    const st = await fsp.statfs(rootPath)
    const total = st.blocks * st.bsize
    const free = st.bavail * st.bsize
    if (total <= 0) return null
    return {
      path: rootPath,
      label: rootPath.replace(/[\\/]$/, ''),
      total,
      free,
      used: Math.max(0, total - free)
    }
  } catch {
    return null
  }
}

async function getWindowsDrives(): Promise<DriveInfo[]> {
  const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZAB'.split('')
  const found = await Promise.all(
    letters.map(async (l) => {
      const root = `${l}:\\`
      try {
        await fsp.access(root)
      } catch {
        return null
      }
      return statfsDrive(root)
    })
  )
  const drives = found.filter((d): d is DriveInfo => d !== null)

  // Best-effort: enrich with volume labels via PowerShell (non-fatal).
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-Volume | Where-Object DriveLetter | Select-Object DriveLetter,FileSystemLabel | ConvertTo-Json -Compress"',
      { windowsHide: true, timeout: 4000 }
    )
    const parsed = JSON.parse(stdout)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    const byLetter = new Map<string, string>()
    for (const v of arr) {
      if (v && v.DriveLetter) byLetter.set(`${v.DriveLetter}:`, v.FileSystemLabel || '')
    }
    for (const d of drives) {
      const vn = byLetter.get(d.label)
      if (vn) d.volumeName = vn
    }
  } catch {
    /* labels are optional */
  }

  return drives
}

async function getPosixDrives(): Promise<DriveInfo[]> {
  const root = await statfsDrive('/')
  return root ? [{ ...root, label: '/', volumeName: 'Root' }] : []
}
