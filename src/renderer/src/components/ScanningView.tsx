import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { formatBytes } from '@shared/format'

/** Full-bleed skeleton + live progress shown during the first scan. */
export function ScanningView(): JSX.Element {
  const progress = useStore((s) => s.progress)
  const pct = progress?.percentDone ?? -1
  const indeterminate = pct < 0

  return (
    <div className="flex h-full flex-col">
      {/* Live status card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-4 p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Scanning your drive…</div>
            <div className="mt-1 truncate font-mono text-2xs text-muted" style={{ maxWidth: 520 }}>
              {progress?.path ?? 'Starting up the worker…'}
            </div>
          </div>
          <div className="text-right">
            <div className="tnum text-2xl font-extrabold text-accent">
              {indeterminate ? '…' : `${pct}%`}
            </div>
            <div className="tnum text-2xs text-muted">
              {progress ? `${progress.filesScanned.toLocaleString()} files · ${formatBytes(progress.bytesScanned)}` : ''}
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
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

      {/* Skeleton mosaic suggesting the treemap that's coming */}
      <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-3 gap-3">
        {[
          'col-span-2 row-span-2',
          'col-span-2 row-span-1',
          'col-span-1 row-span-1',
          'col-span-1 row-span-1',
          'col-span-2 row-span-1',
          'col-span-1 row-span-1',
          'col-span-1 row-span-1'
        ].map((span, i) => (
          <div key={i} className={`skeleton rounded-lg ${span}`} />
        ))}
      </div>
    </div>
  )
}
