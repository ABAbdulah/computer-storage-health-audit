import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  ChevronRight,
  X,
  Folder,
  File as FileIcon,
  Lightbulb,
  ShieldCheck,
  AlertTriangle,
  ShieldX,
  CheckSquare,
  Square,
  Trash2,
  Loader2,
  RotateCw,
  Sparkles
} from 'lucide-react'
import type { Category, CleanResult, ScanNode } from '@shared/types'
import { useStore } from '@/store/useStore'
import { collectByCategory } from '@/lib/tree'
import { CATEGORY_LABELS, CATEGORY_ICON, catColor, CATEGORY_SAFETY, SAFETY_STYLE } from '@/lib/categories'
import { formatBytes, formatPercent } from '@shared/format'

/** Actionable, safe guidance per category. */
const TIPS: Partial<Record<Category, string>> = {
  docker:
    'These are Docker / WSL virtual disks (ext4.vhdx). Don’t delete the file — it holds your images & volumes. Reclaim space with “docker system prune -a --volumes”, then compact the disk (wsl --shutdown, then Optimize-VHD), or in Docker Desktop → Settings → Resources → Clean / Purge data.',
  dev: 'node_modules, build output and caches. Safe to delete — they regenerate on the next install/build. Tools like “npx npkill” can bulk-remove node_modules.',
  temp: 'Temp folders and browser caches. Safe to clear — apps recreate them as needed. Tick the items below and use Safe Clean.',
  system: 'Windows system files. Be careful — use Disk Cleanup / “Storage Sense” rather than deleting these directly.',
  media: 'Large media files (video, images, ISOs). Review and move to external storage or the cloud.',
  apps: 'Installed programs. Uninstall via Settings → Apps rather than deleting folders.'
}

export function CategoryView(): JSX.Element | null {
  const result = useStore((s) => s.result)
  const cat = useStore((s) => s.categoryFilter)
  const setCategoryFilter = useStore((s) => s.setCategoryFilter)
  const navigateTo = useStore((s) => s.navigateTo)
  const drillInto = useStore((s) => s.drillInto)
  const openInExplorer = useStore((s) => s.openInExplorer)
  const search = useStore((s) => s.search.trim().toLowerCase())
  const cleaning = useStore((s) => s.cleaning)
  const runClean = useStore((s) => s.runClean)
  const startScan = useStore((s) => s.startScan)
  const activeDrive = useStore((s) => s.activeDrive)

  const items = useMemo(() => {
    if (!result || !cat) return []
    const list = collectByCategory(result.root, cat)
    return search ? list.filter((n) => n.name.toLowerCase().includes(search)) : list
  }, [result, cat, search])

  // Safe Clean is only offered for the genuinely-safe Temp / Cache category.
  const cleanable = cat === 'temp'

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null)

  // Default: pre-select every clearable item when the list/category changes.
  useEffect(() => {
    setSelected(cleanable ? new Set(items.map((i) => i.path)) : new Set())
    setConfirming(false)
    setCleanResult(null)
  }, [cat, cleanable, items.length])

  if (!result || !cat) return null

  const Icon = CATEGORY_ICON[cat]
  const total = result.categoryTotals[cat] || items.reduce((s, n) => s + n.size, 0)
  const color = catColor(cat)
  const safety = CATEGORY_SAFETY[cat]
  const SafetyIcon = safety.level === 'safe' ? ShieldCheck : safety.level === 'keep' ? ShieldX : AlertTriangle

  const selectedItems = items.filter((i) => selected.has(i.path))
  const selectedSize = selectedItems.reduce((s, n) => s + n.size, 0)
  const allSelected = items.length > 0 && selected.size === items.length

  const toggle = (path: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  const doClean = async (): Promise<void> => {
    const res = await runClean([...selected])
    setCleanResult(res)
    setConfirming(false)
  }

  const rowGrid = cleanable
    ? 'grid-cols-[26px_1fr_110px_80px_116px]'
    : 'grid-cols-[1fr_120px_92px_120px]'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-xl"
            style={{ backgroundColor: catColor(cat, 0.14), color }}
          >
            <Icon size={22} />
          </span>
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight">{CATEGORY_LABELS[cat]}</h2>
              <span className="tnum text-lg font-bold" style={{ color }}>
                {formatBytes(total)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${SAFETY_STYLE[safety.level]}`}
                title={safety.hint}
              >
                <SafetyIcon size={12} /> {safety.label}
              </span>
              <p className="text-2xs text-muted">
                {items.length} item{items.length === 1 ? '' : 's'} across this drive
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setCategoryFilter(cat)}
          className="btn h-8 gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs text-muted hover:text-content hover:border-border-strong"
        >
          <X size={13} /> Clear filter
        </button>
      </div>

      {/* Tip */}
      {TIPS[cat] && (
        <div className="mb-3 flex gap-2.5 rounded-xl border border-border bg-surface-2/60 px-4 py-3">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs leading-relaxed text-muted">{TIPS[cat]}</p>
        </div>
      )}

      {/* Items */}
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        {cleanable && items.length > 0 && (
          <div className={`grid ${rowGrid} items-center gap-3 border-b border-border bg-surface-2/60 px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-muted`}>
            <button
              onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.path)))}
              className="grid place-items-center text-muted hover:text-content"
              title={allSelected ? 'Deselect all' : 'Select all'}
            >
              {allSelected ? <CheckSquare size={15} className="text-accent" /> : <Square size={15} />}
            </button>
            <span>Folder</span>
            <span className="text-right">Size</span>
            <span className="text-right">Share</span>
            <span />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="grid place-items-center py-20 text-sm text-muted">
              No {CATEGORY_LABELS[cat]} items found.
            </div>
          ) : (
            items.map((node, i) => {
              const frac = total > 0 ? node.size / total : 0
              const drillable = node.isDir && !!node.children?.length
              const isSel = selected.has(node.path)
              return (
                <motion.div
                  key={node.path + node.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.25 }}
                  className={`group grid ${rowGrid} items-center gap-3 border-b border-border/60 px-4 py-3 hover:bg-surface-2/70 ${
                    cleanable && !isSel ? 'opacity-55' : ''
                  }`}
                >
                  {cleanable && (
                    <button
                      onClick={() => toggle(node.path)}
                      className="grid place-items-center"
                      aria-label={isSel ? 'Deselect' : 'Select'}
                    >
                      {isSel ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} className="text-faint" />}
                    </button>
                  )}
                  <div className="flex min-w-0 items-center gap-2.5">
                    {node.isDir ? (
                      <Folder size={15} className="shrink-0" style={{ color }} />
                    ) : (
                      <FileIcon size={15} className="shrink-0 text-faint" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-mono text-sm font-medium">{node.name}</div>
                      <div className="truncate font-mono text-2xs text-faint">{node.path}</div>
                    </div>
                  </div>
                  <span className="tnum text-right text-sm font-semibold">{formatBytes(node.size)}</span>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-8 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(3, frac * 100)}%`, backgroundColor: color }} />
                    </div>
                    <span className="tnum w-8 text-right text-2xs text-muted">{formatPercent(frac, 0)}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    {drillable && (
                      <button
                        onClick={() => {
                          setCategoryFilter(cat)
                          navigateTo(node.path)
                          drillInto(node)
                        }}
                        className="btn h-7 gap-1 rounded-md border border-border bg-surface px-2 text-2xs text-muted hover:text-content"
                        title="Open in map"
                      >
                        Map <ChevronRight size={11} />
                      </button>
                    )}
                    <button
                      onClick={() => void openInExplorer(node.path)}
                      className="btn h-7 gap-1 rounded-md bg-accent/10 px-2 text-2xs text-accent hover:bg-accent/20"
                    >
                      <FolderOpen size={12} /> Open
                    </button>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Safe Clean action bar */}
      {cleanable && items.length > 0 && (
        <AnimatePresence mode="wait">
          {cleanResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-positive/30 bg-positive/10 px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-positive" />
                <div>
                  <div className="text-sm font-bold text-positive">
                    Reclaimed {formatBytes(cleanResult.freedBytes)}
                  </div>
                  <div className="text-2xs text-muted">
                    Cleared {cleanResult.cleared} folder{cleanResult.cleared === 1 ? '' : 's'}
                    {cleanResult.failed > 0 ? ` · ${cleanResult.failed} skipped (in use)` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => activeDrive && void startScan(activeDrive)}
                  className="btn h-9 gap-1.5 bg-accent px-3.5 text-sm text-white hover:brightness-110"
                >
                  <RotateCw size={14} /> Rescan
                </button>
                <button
                  onClick={() => setCleanResult(null)}
                  className="btn h-9 rounded-lg border border-border bg-surface px-3 text-sm text-muted hover:text-content"
                >
                  Done
                </button>
              </div>
            </motion.div>
          ) : confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-warning" />
                <p className="text-sm">
                  Permanently clear <b>{selectedItems.length}</b> cache folder
                  {selectedItems.length === 1 ? '' : 's'} (~{formatBytes(selectedSize)})? Apps recreate them automatically.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={cleaning}
                  onClick={() => void doClean()}
                  className="btn h-9 gap-1.5 bg-danger px-4 text-sm text-white hover:brightness-110 disabled:opacity-60"
                >
                  {cleaning ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {cleaning ? 'Clearing…' : 'Yes, clear'}
                </button>
                <button
                  disabled={cleaning}
                  onClick={() => setConfirming(false)}
                  className="btn h-9 rounded-lg border border-border bg-surface px-3 text-sm text-muted hover:text-content"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5"
            >
              <div className="flex items-center gap-2 text-xs text-muted">
                <ShieldCheck size={15} className="text-positive" />
                <span>
                  <b className="text-content">{selectedItems.length}</b> of {items.length} selected ·{' '}
                  <b className="text-content">{formatBytes(selectedSize)}</b> · sent permanently (caches regenerate)
                </span>
              </div>
              <button
                disabled={selectedItems.length === 0}
                onClick={() => setConfirming(true)}
                className="btn h-9 gap-1.5 bg-accent px-4 text-sm text-white shadow-glow hover:brightness-110 disabled:opacity-40"
              >
                <Trash2 size={15} /> Safe Clean ({formatBytes(selectedSize)})
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
