import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { Treemap } from './Treemap'
import { ListView } from './ListView'
import { EmptyState } from './EmptyState'
import { ScanningView } from './ScanningView'
import { CategoryView } from './CategoryView'
import { RescanBar } from './RescanBar'
import { ByteTicker } from './NumberTicker'
import { catColor, CATEGORY_LABELS } from '@/lib/categories'
import { CATEGORIES, type Category } from '@shared/types'
import { formatBytes, formatPercent } from '@shared/format'

function CompositionBar({ totals, grand }: { totals: Record<Category, number>; grand: number }): JSX.Element {
  const segs = CATEGORIES.map((c) => ({ c, v: totals[c] })).filter((s) => s.v > 0)
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      {segs.map((s) => (
        <motion.div
          key={s.c}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ backgroundColor: catColor(s.c) }}
          initial={{ width: 0 }}
          animate={{ width: `${(s.v / grand) * 100}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          title={`${CATEGORY_LABELS[s.c]} — ${formatBytes(s.v)}`}
        />
      ))}
    </div>
  )
}

function ResultHeader(): JSX.Element | null {
  const currentNode = useStore((s) => s.currentNode())
  const isRoot = useStore((s) => s.currentPath === s.result?.root.path)
  if (!currentNode) return null

  // Composition of the *current* folder by category.
  const totals = useMemo(() => {
    const t = CATEGORIES.reduce((a, c) => ((a[c] = 0), a), {} as Record<Category, number>)
    for (const child of currentNode.children ?? []) t[child.category] += child.size
    return t
  }, [currentNode])
  const grand = currentNode.size || 1

  return (
    <div className="mb-4 flex items-end justify-between gap-6">
      <div className="min-w-0">
        <div className="text-2xs font-semibold uppercase tracking-wider text-faint">
          {isRoot ? 'Total used on this drive' : 'Folder size'}
        </div>
        <ByteTicker
          bytes={currentNode.size}
          className="block whitespace-nowrap text-3xl font-extrabold tracking-tight"
          unitClassName="text-xl font-bold text-muted"
        />
        <div className="mt-0.5 truncate font-mono text-2xs text-muted">{currentNode.path}</div>
      </div>
      <div className="hidden w-[46%] max-w-md shrink-0 md:block">
        <CompositionBar totals={totals} grand={grand} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {CATEGORIES.filter((c) => totals[c] > 0)
            .sort((a, b) => totals[b] - totals[a])
            .slice(0, 5)
            .map((c) => (
              <span key={c} className="flex items-center gap-1.5 text-2xs text-muted">
                <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: catColor(c) }} />
                {CATEGORY_LABELS[c]}
                <span className="tnum text-faint">{formatPercent(totals[c] / grand, 0)}</span>
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

export function MainContent(): JSX.Element {
  const status = useStore((s) => s.status)
  const result = useStore((s) => s.result)
  const viewMode = useStore((s) => s.viewMode)
  const categoryFilter = useStore((s) => s.categoryFilter)

  // A rescan running on top of existing results — show progress and mark the
  // (now stale) data as refreshing rather than silently leaving old numbers up.
  const rescanning = status === 'scanning' && !!result

  let body: JSX.Element
  if (status === 'scanning' && !result) {
    body = <ScanningView />
  } else if (!result) {
    body = <EmptyState />
  } else if (categoryFilter) {
    // A category was selected (e.g. from the sidebar) — show every item of that
    // category across the whole drive, largest first.
    body = <CategoryView />
  } else {
    body = (
      <div className="flex h-full flex-col">
        <ResultHeader />
        <div className="min-h-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              {viewMode === 'treemap' ? <Treemap /> : <ListView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-5">
      <AnimatePresence>{rescanning && <RescanBar />}</AnimatePresence>
      <div
        className={`flex min-h-0 flex-1 flex-col transition-opacity duration-300 ${
          rescanning ? 'pointer-events-none opacity-40' : 'opacity-100'
        }`}
      >
        {body}
      </div>
    </main>
  )
}
