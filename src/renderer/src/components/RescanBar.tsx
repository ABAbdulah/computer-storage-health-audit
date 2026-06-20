import { motion } from 'framer-motion'
import { Loader2, XCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatBytes } from '@shared/format'

/**
 * Slim progress banner shown while a *re*scan runs over already-displayed
 * results — so it's obvious the on-screen numbers are stale and being
 * refreshed, and clear when the new data lands.
 */
export function RescanBar(): JSX.Element {
  const progress = useStore((s) => s.progress)
  const cancelScan = useStore((s) => s.cancelScan)
  const pct = progress?.percentDone ?? -1
  const indeterminate = pct < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 shadow-glow"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Loader2 size={16} className="shrink-0 animate-spin text-accent" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-content">Rescanning — numbers below are being refreshed…</div>
            <div className="truncate font-mono text-2xs text-muted" style={{ maxWidth: 460 }}>
              {progress?.path ?? 'Starting…'}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="tnum text-base font-extrabold text-accent">
              {indeterminate ? '…' : `${pct}%`}
            </div>
            <div className="tnum text-2xs text-muted">
              {progress ? `${progress.filesScanned.toLocaleString()} files · ${formatBytes(progress.bytesScanned)}` : ''}
            </div>
          </div>
          <button
            onClick={() => void cancelScan()}
            className="btn h-8 gap-1.5 rounded-lg bg-danger/10 px-3 text-xs text-danger hover:bg-danger/20"
          >
            <XCircle size={14} /> Cancel
          </button>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        {indeterminate ? (
          <motion.div
            className="h-full w-1/3 rounded-full bg-accent"
            animate={{ x: ['-100%', '320%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        )}
      </div>
    </motion.div>
  )
}
