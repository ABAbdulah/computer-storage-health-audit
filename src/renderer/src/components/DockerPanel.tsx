import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Container,
  Play,
  Square,
  Trash2,
  Loader2,
  RefreshCw,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react'
import type { DockerContainer } from '@shared/types'
import { useStore } from '@/store/useStore'

function StateDot({ state }: { state: string }): JSX.Element {
  const running = state === 'running'
  const paused = state === 'paused'
  const color = running ? 'rgb(var(--positive))' : paused ? 'rgb(var(--warning))' : 'rgb(var(--faint))'
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {running && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: color }} />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}

function ContainerRow({ c }: { c: DockerContainer }): JSX.Element {
  const runDockerAction = useStore((s) => s.runDockerAction)
  const busyId = useStore((s) => s.dockerBusyId)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const running = c.state === 'running'
  const busy = busyId === c.id

  return (
    <li className="rounded-lg border border-border bg-surface px-2.5 py-2">
      <div className="flex items-center gap-2">
        <StateDot state={c.state} />
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">{c.name || c.id}</span>
        {c.size && <span className="tnum shrink-0 text-2xs text-muted">{c.size.split(' ')[0]}</span>}
      </div>
      <div className="mt-0.5 truncate pl-4 font-mono text-[10px] text-faint">{c.image}</div>
      <div className="mt-1.5 flex items-center gap-1.5 pl-4">
        <button
          disabled={busy}
          onClick={() => void runDockerAction(running ? 'stop' : 'start', c.id)}
          className={`btn h-6 gap-1 rounded-md px-2 text-[11px] ${
            running ? 'bg-warning/15 text-warning hover:bg-warning/25' : 'bg-positive/15 text-positive hover:bg-positive/25'
          }`}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : running ? <Square size={10} /> : <Play size={10} />}
          {running ? 'Stop' : 'Start'}
        </button>
        {confirmRemove ? (
          <button
            disabled={busy}
            onClick={() => {
              setConfirmRemove(false)
              void runDockerAction('rm', c.id)
            }}
            className="btn h-6 gap-1 rounded-md bg-danger px-2 text-[11px] text-white hover:brightness-110"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={10} />}
            Confirm remove
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => setConfirmRemove(true)}
            onBlur={() => setConfirmRemove(false)}
            className="btn h-6 gap-1 rounded-md bg-danger/10 px-2 text-[11px] text-danger hover:bg-danger/20"
          >
            <Trash2 size={10} /> Remove
          </button>
        )}
        <span className="ml-auto truncate text-[10px] text-faint">{c.status}</span>
      </div>
    </li>
  )
}

export function DockerPanel(): JSX.Element | null {
  const dockerInfo = useStore((s) => s.dockerInfo)
  const loading = useStore((s) => s.dockerLoading)
  const loadDockerInfo = useStore((s) => s.loadDockerInfo)
  const runDockerAction = useStore((s) => s.runDockerAction)
  const busyId = useStore((s) => s.dockerBusyId)
  const [open, setOpen] = useState(true)
  const [confirmPrune, setConfirmPrune] = useState(false)

  // Hide entirely until we know whether Docker exists.
  if (!dockerInfo) return null
  if (!dockerInfo.available) {
    return (
      <div className="mb-3 rounded-xl border border-border bg-surface px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Container size={15} className="text-faint" />
          <span className="flex-1">{dockerInfo.error || 'Docker not detected'}</span>
        </div>
      </div>
    )
  }

  const running = dockerInfo.containers.filter((c) => c.state === 'running').length
  const dfImages = dockerInfo.df.find((d) => /image/i.test(d.type))
  const reclaimable = dockerInfo.df
    .map((d) => d.reclaimable)
    .find((r) => r && !/^0/.test(r))

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-bg">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-cat-docker/15" style={{ color: 'rgb(var(--cat-docker))' }}>
          <Container size={15} />
        </span>
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <span className="text-sm font-bold">Docker</span>
          <span className="rounded-full bg-positive/15 px-1.5 py-0.5 text-[10px] font-semibold text-positive">
            {running} running
          </span>
          <ChevronDown size={14} className={`ml-auto text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => void loadDockerInfo()}
          className="rounded-md p-1 text-muted hover:text-content"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {dockerInfo.containers.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted">No containers.</p>
              ) : (
                <ul className="space-y-1.5">
                  {dockerInfo.containers.map((c) => (
                    <ContainerRow key={c.id} c={c} />
                  ))}
                </ul>
              )}

              {/* Images + prune summary */}
              <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2.5 text-2xs text-muted">
                <Layers size={13} className="text-faint" />
                <span>
                  {dockerInfo.images.length} images
                  {dfImages?.reclaimable ? ` · ${dfImages.reclaimable} reclaimable` : ''}
                </span>
                {confirmPrune ? (
                  <button
                    disabled={busyId === 'prune'}
                    onClick={() => {
                      setConfirmPrune(false)
                      void runDockerAction('prune')
                    }}
                    className="btn ml-auto h-6 gap-1 rounded-md bg-danger px-2 text-[11px] text-white hover:brightness-110"
                  >
                    {busyId === 'prune' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={10} />}
                    Confirm prune
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmPrune(true)}
                    onBlur={() => setConfirmPrune(false)}
                    className="btn ml-auto h-6 gap-1 rounded-md bg-accent/10 px-2 text-[11px] text-accent hover:bg-accent/20"
                    title="docker system prune -f (removes stopped containers, unused networks, dangling images & build cache)"
                  >
                    <Sparkles size={10} /> Prune
                  </button>
                )}
              </div>
              {reclaimable && (
                <p className="mt-1.5 text-[10px] text-faint">
                  Total reclaimable across Docker: <span className="font-semibold text-positive">{reclaimable}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
