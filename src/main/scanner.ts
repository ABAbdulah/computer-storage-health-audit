import { Worker } from 'node:worker_threads'
import path from 'node:path'
import { promises as fsp } from 'node:fs'
import { app } from 'electron'
import type { Category, ScanNode, ScanProgress, ScanResult } from '@shared/types'
import { CATEGORIES } from '@shared/types'

const CACHE_VERSION = 1
const MIN_NODE_BYTES = 2 * 1024 * 1024 // 2 MB — retain items at least this big
const MAX_CHILDREN = 140

interface ScanHandlers {
  onProgress: (p: ScanProgress) => void
  onComplete: (r: ScanResult) => void
  onError: (message: string) => void
}

function resolveWorkerPath(): string {
  let p = path.join(__dirname, 'scanWorker.js')
  // When packaged, the worker is unpacked from the asar archive.
  if (app.isPackaged && p.includes('app.asar')) {
    p = p.replace('app.asar', 'app.asar.unpacked')
  }
  return p
}

function cacheFile(): string {
  return path.join(app.getPath('userData'), 'last-scan.json')
}

export class ScanManager {
  private worker: Worker | null = null
  private lastResult: ScanResult | null = null

  get isScanning(): boolean {
    return this.worker !== null
  }

  getLastResult(): ScanResult | null {
    return this.lastResult
  }

  async loadCache(): Promise<ScanResult | null> {
    try {
      const raw = await fsp.readFile(cacheFile(), 'utf-8')
      const parsed = JSON.parse(raw) as { result: ScanResult; version: number }
      if (parsed.version === CACHE_VERSION && parsed.result?.root) {
        this.lastResult = parsed.result
        return parsed.result
      }
    } catch {
      /* no cache yet */
    }
    return null
  }

  private async saveCache(result: ScanResult): Promise<void> {
    try {
      await fsp.writeFile(
        cacheFile(),
        JSON.stringify({ version: CACHE_VERSION, result }),
        'utf-8'
      )
    } catch {
      /* non-fatal */
    }
  }

  async start(drivePath: string, usedBytes: number, handlers: ScanHandlers): Promise<void> {
    await this.cancel()
    const startedAt = Date.now()

    const worker = new Worker(resolveWorkerPath(), {
      workerData: {
        rootPath: drivePath,
        usedBytes,
        minNodeBytes: MIN_NODE_BYTES,
        maxChildren: MAX_CHILDREN
      }
    })
    this.worker = worker

    worker.on('message', (msg: any) => {
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'progress') {
        handlers.onProgress({
          path: msg.path,
          filesScanned: msg.filesScanned,
          bytesScanned: msg.bytesScanned,
          percentDone: msg.percentDone
        })
      } else if (msg.type === 'done') {
        const categoryTotals = normalizeTotals(msg.categoryTotals)
        const result: ScanResult = {
          root: msg.root as ScanNode,
          drivePath,
          scannedAt: Date.now(),
          durationMs: Date.now() - startedAt,
          filesScanned: msg.filesScanned,
          skipped: msg.skipped,
          categoryTotals
        }
        this.lastResult = result
        void this.saveCache(result)
        this.cleanup()
        handlers.onComplete(result)
      } else if (msg.type === 'error') {
        const wasCancel = msg.message === 'cancelled'
        this.cleanup()
        handlers.onError(wasCancel ? 'cancelled' : String(msg.message))
      }
    })

    worker.on('error', (err) => {
      this.cleanup()
      handlers.onError(err instanceof Error ? err.message : String(err))
    })

    worker.on('exit', () => {
      // If the worker exits without having posted done/error, surface nothing
      // extra — cleanup already ran in the message/error handlers.
      this.worker = null
    })
  }

  async cancel(): Promise<void> {
    if (!this.worker) return
    try {
      this.worker.postMessage({ type: 'cancel' })
      // Give it a brief moment to unwind, then force-terminate.
      await new Promise((r) => setTimeout(r, 120))
    } catch {
      /* ignore */
    }
    await this.terminate()
  }

  private async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate()
      } catch {
        /* ignore */
      }
      this.worker = null
    }
  }

  private cleanup(): void {
    if (this.worker) {
      void this.worker.terminate()
      this.worker = null
    }
  }
}

function normalizeTotals(raw: Record<string, number> | undefined): Record<Category, number> {
  const out = CATEGORIES.reduce((a, c) => ((a[c] = 0), a), {} as Record<Category, number>)
  if (raw) for (const c of CATEGORIES) out[c] = raw[c] || 0
  return out
}
