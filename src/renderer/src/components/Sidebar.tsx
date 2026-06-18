import { motion } from 'framer-motion'
import { HardDrive, Loader2, ScanLine } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { DriveDonut } from './DriveDonut'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import { SystemMonitor } from './SystemMonitor'
import { formatBytes } from '@shared/format'
import { CATEGORIES, type Category } from '@shared/types'
import { CATEGORY_LABELS, catColor } from '@/lib/categories'

function DriveRow({ path }: { path: string }): JSX.Element | null {
  const drive = useStore((s) => s.drives.find((d) => d.path === path))
  const activeDrive = useStore((s) => s.activeDrive)
  const status = useStore((s) => s.status)
  const setActiveDrive = useStore((s) => s.setActiveDrive)
  const startScan = useStore((s) => s.startScan)
  if (!drive) return null

  const active = activeDrive === drive.path
  const scanning = status === 'scanning' && active

  return (
    <motion.button
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => setActiveDrive(drive.path)}
      className={`group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
        active
          ? 'border-accent/40 bg-accent-soft/60 shadow-glow'
          : 'border-border bg-surface hover:border-border-strong'
      }`}
    >
      <DriveDonut drive={drive} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <HardDrive size={13} className="text-muted" />
          <span className="font-mono text-sm font-semibold">{drive.label}</span>
          {drive.volumeName && (
            <span className="truncate text-2xs text-faint">{drive.volumeName}</span>
          )}
        </div>
        <div className="tnum mt-0.5 text-2xs text-muted">
          {formatBytes(drive.used)} <span className="text-faint">of</span> {formatBytes(drive.total)}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            if (status !== 'scanning') void startScan(drive.path)
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && status !== 'scanning') {
              e.stopPropagation()
              void startScan(drive.path)
            }
          }}
          className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-semibold transition-colors ${
            scanning
              ? 'text-accent'
              : 'bg-accent/10 text-accent hover:bg-accent/20'
          }`}
        >
          {scanning ? (
            <>
              <Loader2 size={11} className="animate-spin" /> Scanning…
            </>
          ) : (
            <>
              <ScanLine size={11} /> Scan drive
            </>
          )}
        </div>
      </div>
    </motion.button>
  )
}

function CategoryLegend(): JSX.Element | null {
  const result = useStore((s) => s.result)
  const categoryFilter = useStore((s) => s.categoryFilter)
  const setCategoryFilter = useStore((s) => s.setCategoryFilter)
  if (!result) return null

  const totals = result.categoryTotals
  const grand = CATEGORIES.reduce((s, c) => s + totals[c], 0) || 1
  const ordered = [...CATEGORIES].sort((a, b) => totals[b] - totals[a]).filter((c) => totals[c] > 0)

  return (
    <div className="mt-2">
      <h2 className="px-1 text-2xs font-semibold uppercase tracking-wider text-faint">
        Categories
      </h2>
      <ul className="mt-2 space-y-0.5">
        {ordered.map((cat) => {
          const frac = totals[cat] / grand
          const dimmed = categoryFilter !== null && categoryFilter !== cat
          return (
            <li key={cat}>
              <button
                onClick={() => setCategoryFilter(cat as Category)}
                className={`group w-full rounded-lg px-2 py-1.5 text-left transition-all ${
                  categoryFilter === cat ? 'bg-surface-2' : 'hover:bg-surface-2'
                } ${dimmed ? 'opacity-45' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: catColor(cat) }}
                    />
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="tnum text-2xs text-muted">{formatBytes(totals[cat])}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: catColor(cat) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(2, frac * 100)}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Sidebar(): JSX.Element {
  const drives = useStore((s) => s.drives)

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Logo size={26} />
        <div className="leading-none">
          <div className="text-base font-extrabold tracking-tight">SpaceScope</div>
          <div className="mt-0.5 text-2xs text-faint">Where did my disk go?</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <h2 className="px-1 pb-2 text-2xs font-semibold uppercase tracking-wider text-faint">
          Drives
        </h2>
        <div className="space-y-2">
          {drives.length === 0 ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-[76px] w-full rounded-xl" />
              ))}
            </div>
          ) : (
            drives.map((d) => <DriveRow key={d.path} path={d.path} />)
          )}
        </div>

        <CategoryLegend />
      </div>

      <SystemMonitor />

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-2xs text-faint">v1.0.0 · Open source</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
