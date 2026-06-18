import { useEffect, useRef, useState } from 'react'
import { Cpu, MemoryStick, Gauge } from 'lucide-react'
import type { SysStats } from '@shared/types'
import { Sparkline } from './Sparkline'
import { formatBytes } from '@shared/format'

const HISTORY = 40

interface Series {
  cpu: number[]
  mem: number[]
  gpu: number[]
}

interface MeterProps {
  icon: React.ReactNode
  label: string
  pct: number
  detail: string
  history: number[]
  colorVar: string
}

function Meter({ icon, label, pct, detail, history, colorVar }: MeterProps): JSX.Element {
  const color = `rgb(var(${colorVar}))`
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-2xs font-medium text-muted">
          <span style={{ color }}>{icon}</span>
          {label}
        </span>
        <span className="tnum text-xs font-bold" style={{ color }}>
          {pct < 0 ? '—' : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="mt-1 -mx-0.5">
        <Sparkline data={history} max={100} color={color} width={196} height={26} />
      </div>
      <div className="tnum mt-0.5 text-[10px] leading-none text-faint">{detail}</div>
    </div>
  )
}

export function SystemMonitor(): JSX.Element | null {
  const [stats, setStats] = useState<SysStats | null>(null)
  const series = useRef<Series>({ cpu: [], mem: [], gpu: [] })
  const [, force] = useState(0)

  useEffect(() => {
    const unsub = window.spacescope.onSysStats((s) => {
      const memPct = s.memTotal > 0 ? (s.memUsed / s.memTotal) * 100 : 0
      const gpuPct = s.gpu && s.gpu.util >= 0 ? s.gpu.util : -1
      const push = (arr: number[], v: number): number[] => {
        const next = [...arr, v]
        return next.length > HISTORY ? next.slice(next.length - HISTORY) : next
      }
      series.current = {
        cpu: push(series.current.cpu, s.cpu),
        mem: push(series.current.mem, memPct),
        gpu: push(series.current.gpu, gpuPct < 0 ? 0 : gpuPct)
      }
      setStats(s)
      force((x) => x + 1)
    })
    return unsub
  }, [])

  if (!stats) {
    return (
      <div className="border-t border-border px-3 py-3">
        <div className="skeleton h-[68px] w-full rounded-lg" />
      </div>
    )
  }

  const memPct = stats.memTotal > 0 ? (stats.memUsed / stats.memTotal) * 100 : 0
  const hasGpu = !!stats.gpu

  return (
    <div className="border-t border-border px-3 py-3">
      <h2 className="px-1 pb-2 text-2xs font-semibold uppercase tracking-wider text-faint">
        System
      </h2>
      <div className="space-y-2">
        <Meter
          icon={<Cpu size={12} />}
          label="CPU"
          pct={stats.cpu}
          detail={`${stats.cores.length} cores`}
          history={series.current.cpu}
          colorVar="--accent"
        />
        <Meter
          icon={<MemoryStick size={12} />}
          label="Memory"
          pct={memPct}
          detail={`${formatBytes(stats.memUsed)} / ${formatBytes(stats.memTotal)}`}
          history={series.current.mem}
          colorVar="--cat-media"
        />
        {hasGpu && (
          <Meter
            icon={<Gauge size={12} />}
            label={stats.gpu!.name.replace(/NVIDIA\s*/i, '') || 'GPU'}
            pct={stats.gpu!.util}
            detail={
              stats.gpu!.memTotal > 0
                ? `${formatBytes(stats.gpu!.memUsed)} / ${formatBytes(stats.gpu!.memTotal)}`
                : 'GPU'
            }
            history={series.current.gpu}
            colorVar="--cat-dev"
          />
        )}
      </div>
    </div>
  )
}
