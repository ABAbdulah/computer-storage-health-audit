import { parentPort, workerData } from 'node:worker_threads'
import { promises as fsp, type Dirent } from 'node:fs'
import path from 'node:path'
import { categorize, MEDIA_DOMINANCE_THRESHOLD } from '@shared/categorize'
import type { Category, ScanNode } from '@shared/types'
import { CATEGORIES } from '@shared/types'

interface WorkerInput {
  rootPath: string
  /** Used bytes on the drive, for a real progress percentage. */
  usedBytes: number
  /** Minimum node size (bytes) to retain as its own item in the output tree. */
  minNodeBytes: number
  /** Max children kept per directory before collapsing the tail. */
  maxChildren: number
}

type WorkerMessage =
  | { type: 'progress'; path: string; filesScanned: number; bytesScanned: number; percentDone: number }
  | {
      type: 'done'
      root: ScanNode
      filesScanned: number
      skipped: number
      categoryTotals: Record<Category, number>
    }
  | { type: 'error'; message: string }

const input = workerData as WorkerInput
const port = parentPort!

let cancelled = false
let filesScanned = 0
let bytesScanned = 0
let skipped = 0
let lastReport = 0

const categoryTotals = CATEGORIES.reduce(
  (acc, c) => ((acc[c] = 0), acc),
  {} as Record<Category, number>
)

// Cancellation is requested from the main process.
port.on('message', (msg: { type?: string }) => {
  if (msg && msg.type === 'cancel') cancelled = true
})

class Cancelled extends Error {}

function maybeReport(current: string): void {
  const now = Date.now()
  if (now - lastReport < 140) return
  lastReport = now
  const pct =
    input.usedBytes > 0
      ? Math.min(99, Math.round((bytesScanned / input.usedBytes) * 100))
      : -1
  const msg: WorkerMessage = {
    type: 'progress',
    path: current,
    filesScanned,
    bytesScanned,
    percentDone: pct
  }
  port.postMessage(msg)
}

/** Simple bounded-concurrency map. */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return results
}

const SKIP_NAMES = new Set([
  'application data',
  'local settings',
  'my documents',
  'all users',
  'documents and settings',
  'cookies',
  'recent',
  'sendto',
  'start menu',
  'templates',
  'nethood',
  'printhood'
])

async function scanDir(
  dirPath: string,
  parentCategory: Category | undefined,
  depth: number
): Promise<ScanNode> {
  if (cancelled) throw new Cancelled()

  const name = path.basename(dirPath) || dirPath
  let dirCategory = categorize({ path: dirPath, name, isDir: true, parentCategory })

  let entries: Dirent[] = []
  try {
    entries = await fsp.readdir(dirPath, { withFileTypes: true })
  } catch {
    // Permission denied / locked / vanished — skip gracefully.
    skipped++
    let mtime = 0
    try {
      mtime = (await fsp.stat(dirPath)).mtimeMs
    } catch {
      /* ignore */
    }
    return { path: dirPath, name, size: 0, isDir: true, category: dirCategory, mtime, fileCount: 0 }
  }

  maybeReport(dirPath)

  const childNodes: ScanNode[] = []
  let totalSize = 0
  let totalFiles = 0
  const childCatBytes = CATEGORIES.reduce((a, c) => ((a[c] = 0), a), {} as Record<Category, number>)

  // Partition entries into sub-directories and files.
  const subDirs: string[] = []
  const files: Dirent[] = []
  for (const e of entries) {
    if (cancelled) throw new Cancelled()
    if (e.isSymbolicLink()) continue // avoid junction/symlink loops
    const lname = e.name.toLowerCase()
    if (e.isDirectory()) {
      if (depth === 0 && SKIP_NAMES.has(lname)) continue
      subDirs.push(path.join(dirPath, e.name))
    } else if (e.isFile()) {
      files.push(e)
    }
  }

  // Stat files (bounded concurrency).
  await mapPool(files, 24, async (e) => {
    if (cancelled) throw new Cancelled()
    const fp = path.join(dirPath, e.name)
    let size = 0
    let mtime = 0
    try {
      const st = await fsp.stat(fp)
      size = st.size
      mtime = st.mtimeMs
    } catch {
      skipped++
      return
    }
    const ext = path.extname(e.name).toLowerCase()
    const cat = categorize({ path: fp, name: e.name, isDir: false, ext, parentCategory: dirCategory })
    filesScanned++
    totalFiles++
    bytesScanned += size
    totalSize += size
    categoryTotals[cat] += size
    childCatBytes[cat] += size
    if (size >= input.minNodeBytes) {
      childNodes.push({ path: fp, name: e.name, size, isDir: false, category: cat, mtime, fileCount: 1 })
    }
    if (filesScanned % 512 === 0) maybeReport(fp)
  })

  // Recurse into sub-directories (bounded concurrency).
  await mapPool(subDirs, 8, async (sp) => {
    if (cancelled) throw new Cancelled()
    const childCat = categorize({ path: sp, name: path.basename(sp), isDir: true, parentCategory: dirCategory })
    const node = await scanDir(sp, childCat, depth + 1)
    totalSize += node.size
    totalFiles += node.fileCount
    childCatBytes[node.category] += node.size
    if (node.size >= input.minNodeBytes) childNodes.push(node)
  })

  // Media dominance: a generic folder dominated by media files becomes "media".
  if ((dirCategory === 'user' || dirCategory === 'other') && totalSize > 0) {
    if (childCatBytes.media / totalSize >= MEDIA_DOMINANCE_THRESHOLD) dirCategory = 'media'
  }
  // If this dir is generic but a single non-generic category dominates, adopt it.
  if (dirCategory === 'other' && totalSize > 0) {
    let best: Category = 'other'
    let bestBytes = 0
    for (const c of CATEGORIES) {
      if (c === 'other') continue
      if (childCatBytes[c] > bestBytes) {
        bestBytes = childCatBytes[c]
        best = c
      }
    }
    if (bestBytes / totalSize >= MEDIA_DOMINANCE_THRESHOLD) dirCategory = best
  }

  // Prune: keep the largest children, collapse the rest into one bucket so the
  // treemap still sums to the directory total.
  childNodes.sort((a, b) => b.size - a.size)
  let retained = childNodes
  const keptBytes = childNodes.reduce((s, c) => s + c.size, 0)
  if (childNodes.length > input.maxChildren) {
    const head = childNodes.slice(0, input.maxChildren)
    const tail = childNodes.slice(input.maxChildren)
    const tailBytes = tail.reduce((s, c) => s + c.size, 0)
    const tailFiles = tail.reduce((s, c) => s + c.fileCount, 0)
    head.push({
      path: dirPath,
      name: `Smaller items (${tail.length})`,
      size: tailBytes,
      isDir: true,
      category: dirCategory,
      mtime: 0,
      fileCount: tailFiles
    })
    retained = head
  }
  // Account for the bytes in files/dirs too small to be retained at all.
  const remainder = totalSize - keptBytes
  if (remainder > input.minNodeBytes && retained.length > 0) {
    retained.push({
      path: dirPath,
      name: 'Smaller files & folders',
      size: remainder,
      isDir: true,
      category: dirCategory,
      mtime: 0,
      fileCount: Math.max(0, totalFiles - retained.reduce((s, c) => s + c.fileCount, 0))
    })
    retained.sort((a, b) => b.size - a.size)
  }

  let mtime = 0
  try {
    mtime = (await fsp.stat(dirPath)).mtimeMs
  } catch {
    /* ignore */
  }

  return {
    path: dirPath,
    name,
    size: totalSize,
    isDir: true,
    category: dirCategory,
    mtime,
    fileCount: totalFiles,
    children: retained.length ? retained : undefined
  }
}

async function run(): Promise<void> {
  try {
    const root = await scanDir(input.rootPath, undefined, 0)
    if (cancelled) {
      port.postMessage({ type: 'error', message: 'cancelled' } satisfies WorkerMessage)
      return
    }
    port.postMessage({
      type: 'done',
      root,
      filesScanned,
      skipped,
      categoryTotals
    } satisfies WorkerMessage)
  } catch (err) {
    if (err instanceof Cancelled || cancelled) {
      port.postMessage({ type: 'error', message: 'cancelled' } satisfies WorkerMessage)
    } else {
      port.postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : String(err)
      } satisfies WorkerMessage)
    }
  }
}

void run()
