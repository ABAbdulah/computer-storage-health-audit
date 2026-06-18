import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  ChevronRight,
  File as FileIcon,
  Folder
} from 'lucide-react'
import type { ScanNode } from '@shared/types'
import { useStore } from '@/store/useStore'
import { CategoryBadge } from './CategoryBadge'
import { catColor } from '@/lib/categories'
import { formatBytes, formatPercent, formatRelativeTime } from '@shared/format'

type SortKey = 'name' | 'size' | 'mtime'
type SortDir = 'asc' | 'desc'

interface Chip {
  id: string
  label: string
  test: (n: ScanNode) => boolean
}

const CHIPS: Chip[] = [
  { id: 'docker', label: 'Docker', test: (n) => n.category === 'docker' },
  {
    id: 'node_modules',
    label: 'node_modules',
    test: (n) => n.name.toLowerCase() === 'node_modules'
  },
  { id: 'temp', label: 'Temp', test: (n) => n.category === 'temp' },
  { id: 'large', label: 'Large Files (>500MB)', test: (n) => !n.isDir && n.size > 500 * 1024 * 1024 },
  { id: 'media', label: 'Media', test: (n) => n.category === 'media' }
]

export function ListView(): JSX.Element {
  const currentNode = useStore((s) => s.currentNode())
  const drillInto = useStore((s) => s.drillInto)
  const openInExplorer = useStore((s) => s.openInExplorer)
  const search = useStore((s) => s.search.trim().toLowerCase())
  const categoryFilter = useStore((s) => s.categoryFilter)

  const [sortKey, setSortKey] = useState<SortKey>('size')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [activeChip, setActiveChip] = useState<string | null>(null)

  const rows = useMemo(() => {
    let items = currentNode?.children ? [...currentNode.children] : []
    if (search) items = items.filter((n) => n.name.toLowerCase().includes(search))
    if (categoryFilter) items = items.filter((n) => n.category === categoryFilter)
    if (activeChip) {
      const chip = CHIPS.find((c) => c.id === activeChip)
      if (chip) items = items.filter(chip.test)
    }
    items.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'size') cmp = a.size - b.size
      else cmp = a.mtime - b.mtime
      return sortDir === 'asc' ? cmp : -cmp
    })
    return items
  }, [currentNode, search, categoryFilter, activeChip, sortKey, sortDir])

  const total = currentNode?.size || 1

  function toggleSort(key: SortKey): void {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  function SortIcon({ k }: { k: SortKey }): JSX.Element {
    if (sortKey !== k) return <ArrowUpDown size={12} className="text-faint" />
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-accent" />
    ) : (
      <ArrowDown size={12} className="text-accent" />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
        {CHIPS.map((chip) => {
          const active = activeChip === chip.id
          return (
            <button
              key={chip.id}
              onClick={() => setActiveChip(active ? null : chip.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-accent/40 bg-accent/15 text-accent'
                  : 'border-border bg-surface text-muted hover:border-border-strong hover:text-content'
              }`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[660px]">
            {/* Header */}
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(150px,1fr)_110px_120px_130px_130px] items-center gap-3 border-b border-border bg-surface px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-muted">
              <button className="flex items-center gap-1.5 text-left hover:text-content" onClick={() => toggleSort('name')}>
                Name <SortIcon k="name" />
              </button>
              <button className="flex items-center justify-end gap-1.5 hover:text-content" onClick={() => toggleSort('size')}>
                Size <SortIcon k="size" />
              </button>
              <span className="text-right">Share</span>
              <span>Category</span>
              <button className="flex items-center gap-1.5 hover:text-content" onClick={() => toggleSort('mtime')}>
                Modified <SortIcon k="mtime" />
              </button>
            </div>

            {/* Rows */}
            {rows.length === 0 ? (
              <div className="grid place-items-center py-20 text-sm text-muted">
                Nothing matches these filters.
              </div>
            ) : (
            rows.map((node, i) => {
              const frac = node.size / total
              const drillable = node.isDir && !!node.children?.length
              return (
                <motion.div
                  key={node.path + node.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.25 }}
                  onClick={() => (drillable ? drillInto(node) : void openInExplorer(node.path))}
                  className="group grid cursor-pointer grid-cols-[minmax(150px,1fr)_110px_120px_130px_130px] items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-surface-2/70"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {node.isDir ? (
                      <Folder size={15} className="shrink-0" style={{ color: catColor(node.category) }} />
                    ) : (
                      <FileIcon size={15} className="shrink-0 text-faint" />
                    )}
                    <span className="truncate font-mono text-sm">{node.name}</span>
                    {drillable && (
                      <ChevronRight size={13} className="shrink-0 text-faint opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                  <span className="tnum text-right text-sm font-semibold">{formatBytes(node.size)}</span>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(3, frac * 100)}%`, backgroundColor: catColor(node.category) }}
                      />
                    </div>
                    <span className="tnum w-10 text-right text-2xs text-muted">{formatPercent(frac, 0)}</span>
                  </div>
                  <div>
                    <CategoryBadge category={node.category} size="sm" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="tnum text-2xs text-muted">{formatRelativeTime(node.mtime)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        void openInExplorer(node.path)
                      }}
                      className="rounded-md p-1 text-muted opacity-0 transition-opacity hover:bg-surface hover:text-content group-hover:opacity-100"
                      title="Open in Explorer"
                    >
                      <FolderOpen size={14} />
                    </button>
                  </div>
                </motion.div>
              )
            })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
