import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2,
  Trash,
  Chrome,
  Globe,
  Flame,
  Container,
  RefreshCw,
  Image,
  Zap,
  FolderOpen,
  ChevronDown,
  Clock,
  FileSearch,
  ShieldAlert,
  Sparkles,
  Loader2
} from 'lucide-react'
import { CLEANABLE_WINS, type QuickWin } from '@shared/types'
import { useStore } from '@/store/useStore'
import { ByteTicker } from './NumberTicker'
import { DockerPanel } from './DockerPanel'
import { formatBytes, formatDate, formatRelativeTime } from '@shared/format'
import type { LucideIcon } from 'lucide-react'

const ICONS: Record<QuickWin['icon'], LucideIcon> = {
  temp: Trash2,
  recycle: Trash,
  chrome: Chrome,
  edge: Globe,
  firefox: Flame,
  docker: Container,
  update: RefreshCw,
  thumbnails: Image
}

function WinRow({ win }: { win: QuickWin }): JSX.Element {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [freed, setFreed] = useState<number | null>(null)
  const openInExplorer = useStore((s) => s.openInExplorer)
  const cleanQuickWin = useStore((s) => s.cleanQuickWin)
  const Icon = ICONS[win.icon]
  const unknown = win.size < 0
  const cleanable = (CLEANABLE_WINS as readonly string[]).includes(win.id) && win.available

  const doClean = async (): Promise<void> => {
    setBusy(true)
    try {
      const r = await cleanQuickWin(win.id, win.path)
      setFreed(r.freedBytes)
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2/60"
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
            win.available ? 'bg-accent/10 text-accent' : 'bg-surface-2 text-faint'
          }`}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{win.label}</div>
          <div className="text-2xs text-faint">
            {unknown ? (win.available ? 'Tap to open' : 'Not detected') : 'Reclaimable'}
          </div>
        </div>
        <span className="tnum shrink-0 text-sm font-bold" style={{ color: unknown ? 'rgb(var(--faint))' : 'rgb(var(--positive))' }}>
          {unknown ? '—' : formatBytes(win.size)}
        </span>
        {cleanable && !unknown && freed === null && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setOpen(true)
              setConfirming(true)
            }}
            title={`Clean ${win.label}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent/10 text-accent hover:bg-accent/20"
          >
            <Trash2 size={13} />
          </button>
        )}
        <ChevronDown
          size={15}
          className={`shrink-0 text-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
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
            <div className="border-t border-border px-3 py-3">
              {freed !== null ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-positive">
                  <Sparkles size={15} /> Freed {formatBytes(freed)}
                </div>
              ) : confirming ? (
                <>
                  <p className="text-xs leading-relaxed text-muted">
                    Permanently clear <b className="text-content">{win.label}</b>? It regenerates automatically — your files and settings are untouched.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => void doClean()}
                      className="btn h-8 flex-1 gap-1.5 bg-danger text-white hover:brightness-110 disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      {busy ? 'Clearing…' : 'Yes, clear'}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setConfirming(false)}
                      className="btn h-8 gap-1.5 border border-border bg-surface px-3 text-muted hover:text-content"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs leading-relaxed text-muted">{win.description}</p>
                  {win.path && (
                    <p className="mt-2 break-all font-mono text-2xs text-faint">{win.path}</p>
                  )}
                  <div className="mt-2.5 flex gap-2">
                    {cleanable && (
                      <button
                        onClick={() => setConfirming(true)}
                        className="btn h-8 flex-1 gap-1.5 bg-positive/10 text-positive hover:bg-positive/20"
                      >
                        <Trash2 size={14} /> Clean
                      </button>
                    )}
                    {win.path && (
                      <button
                        onClick={() => void openInExplorer(win.path!)}
                        className="btn h-8 flex-1 gap-1.5 bg-accent/10 text-accent hover:bg-accent/20"
                      >
                        <FolderOpen size={14} /> Open
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function ScanInfo(): JSX.Element | null {
  const result = useStore((s) => s.result)
  if (!result) return null
  const stats = [
    { icon: Clock, label: 'Scanned', value: formatRelativeTime(result.scannedAt), title: formatDate(result.scannedAt) },
    { icon: FileSearch, label: 'Files', value: result.filesScanned.toLocaleString() },
    { icon: Zap, label: 'Took', value: `${(result.durationMs / 1000).toFixed(1)}s` },
    { icon: ShieldAlert, label: 'Skipped', value: result.skipped.toLocaleString() }
  ]
  return (
    <div className="mt-5">
      <h3 className="px-1 text-2xs font-semibold uppercase tracking-wider text-faint">Scan info</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface px-3 py-2" title={s.title}>
            <div className="flex items-center gap-1.5 text-2xs text-faint">
              <s.icon size={12} /> {s.label}
            </div>
            <div className="tnum mt-0.5 truncate text-sm font-semibold">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RightPanel(): JSX.Element {
  const open = useStore((s) => s.rightPanelOpen)
  const quickWins = useStore((s) => s.quickWins)
  const loading = useStore((s) => s.quickWinsLoading)

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 overflow-hidden border-l border-border bg-bg-elevated"
        >
          <div className="flex h-full w-80 flex-col">
            <div className="flex items-center gap-2 px-4 py-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-positive/15 text-positive">
                <Zap size={17} />
              </span>
              <div>
                <h2 className="text-sm font-bold leading-none">Free Space Fast</h2>
                <p className="mt-1 text-2xs text-faint">Actionable items you can clean now</p>
              </div>
            </div>

            {quickWins && quickWins.total > 0 && (
              <div className="mx-4 mb-3 rounded-xl border border-positive/30 bg-positive/10 px-4 py-3">
                <div className="text-2xs font-medium uppercase tracking-wide text-positive/80">
                  Potential to reclaim
                </div>
                <ByteTicker
                  bytes={quickWins.total}
                  className="text-2xl font-extrabold text-positive"
                  unitClassName="text-base font-bold"
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <DockerPanel />

              <h3 className="px-1 pb-2 text-2xs font-semibold uppercase tracking-wider text-faint">
                Quick wins
              </h3>
              {loading && !quickWins ? (
                <ul className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="skeleton h-[52px] w-full rounded-xl" />
                  ))}
                </ul>
              ) : quickWins ? (
                <ul className="space-y-2">
                  {quickWins.items.map((w) => (
                    <WinRow key={w.id} win={w} />
                  ))}
                </ul>
              ) : (
                <p className="px-1 py-8 text-center text-xs text-muted">
                  Run a scan to surface quick wins.
                </p>
              )}

              <ScanInfo />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
