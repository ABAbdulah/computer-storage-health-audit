import os from 'node:os'
import { exec } from 'node:child_process'
import { BrowserWindow } from 'electron'
import { IPC, type GpuStats, type SysStats } from '@shared/types'

interface CpuSnapshot {
  idle: number
  total: number
  perCore: { idle: number; total: number }[]
}

function snapshot(): CpuSnapshot {
  const cpus = os.cpus()
  let idle = 0
  let total = 0
  const perCore = cpus.map((c) => {
    const t = c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq
    idle += c.times.idle
    total += t
    return { idle: c.times.idle, total: t }
  })
  return { idle, total, perCore }
}

function usageBetween(prev: CpuSnapshot, cur: CpuSnapshot): { cpu: number; cores: number[] } {
  const dIdle = cur.idle - prev.idle
  const dTotal = cur.total - prev.total
  const cpu = dTotal > 0 ? Math.max(0, Math.min(100, (1 - dIdle / dTotal) * 100)) : 0
  const cores = cur.perCore.map((c, i) => {
    const p = prev.perCore[i] ?? c
    const di = c.idle - p.idle
    const dt = c.total - p.total
    return dt > 0 ? Math.max(0, Math.min(100, (1 - di / dt) * 100)) : 0
  })
  return { cpu, cores }
}

/** Query NVIDIA GPUs via nvidia-smi. Resolves null if unavailable. */
function queryGpu(): Promise<GpuStats | null> {
  return new Promise((resolve) => {
    exec(
      'nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
      { windowsHide: true, timeout: 2500 },
      (err, stdout) => {
        if (err || !stdout) return resolve(null)
        const line = stdout.trim().split('\n')[0]
        if (!line) return resolve(null)
        const parts = line.split(',').map((s) => s.trim())
        const [name, util, memUsed, memTotal] = parts
        const u = Number(util)
        resolve({
          name: name || 'GPU',
          util: Number.isFinite(u) ? u : -1,
          // nvidia-smi reports MiB.
          memUsed: (Number(memUsed) || 0) * 1024 * 1024,
          memTotal: (Number(memTotal) || 0) * 1024 * 1024
        })
      }
    )
  })
}

let prev = snapshot()
let timer: ReturnType<typeof setInterval> | null = null
let gpuSupported = true
let lastGpu: GpuStats | null = null
let tick = 0

function broadcast(stats: SysStats): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC.sysStats, stats)
  }
}

export function startSysMon(): void {
  if (timer) return
  prev = snapshot()
  timer = setInterval(async () => {
    const cur = snapshot()
    const { cpu, cores } = usageBetween(prev, cur)
    prev = cur

    // Poll the GPU less often (every ~3s) since it spawns a process.
    if (gpuSupported && tick % 2 === 0) {
      const gpu = await queryGpu()
      if (gpu === null && tick === 0) gpuSupported = false // not present at all
      else lastGpu = gpu
    }
    tick++

    broadcast({
      cpu,
      cores,
      memUsed: os.totalmem() - os.freemem(),
      memTotal: os.totalmem(),
      gpu: lastGpu
    })
  }, 1500)
}

export function stopSysMon(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
