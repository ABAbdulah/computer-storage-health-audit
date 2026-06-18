import { useMemo, useState } from 'react'
import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from 'd3-hierarchy'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, CornerDownRight } from 'lucide-react'
import type { ScanNode } from '@shared/types'
import { useStore } from '@/store/useStore'
import { useElementSize } from '@/hooks/useElementSize'
import { catColor, CATEGORY_LABELS } from '@/lib/categories'
import { formatBytes, formatPercent } from '@shared/format'

interface Laid {
  node: ScanNode
  x: number
  y: number
  w: number
  h: number
}

export function Treemap(): JSX.Element {
  const currentNode = useStore((s) => s.currentNode())
  const drillInto = useStore((s) => s.drillInto)
  const openInExplorer = useStore((s) => s.openInExplorer)
  const search = useStore((s) => s.search.trim().toLowerCase())
  const categoryFilter = useStore((s) => s.categoryFilter)
  const currentPath = useStore((s) => s.currentPath)

  const [ref, { width, height }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<{ node: ScanNode; x: number; y: number } | null>(null)

  const blocks = useMemo<Laid[]>(() => {
    if (!currentNode?.children || width < 10 || height < 10) return []
    type TM = { node?: ScanNode; children?: TM[] }
    const root = hierarchy<TM>(
      { children: currentNode.children.map((c) => ({ node: c })) },
      (d) => d.children
    ).sum((d) => (d.node ? d.node.size : 0))

    treemap<any>().tile(treemapSquarify).size([width, height]).paddingInner(4).round(true)(root)

    return (root.leaves() as HierarchyRectangularNode<any>[])
      .filter((l) => l.data.node)
      .map((l) => ({
        node: l.data.node as ScanNode,
        x: l.x0,
        y: l.y0,
        w: l.x1 - l.x0,
        h: l.y1 - l.y0
      }))
  }, [currentNode, width, height])

  const total = currentNode?.size || 1

  return (
    <div ref={ref} className="relative h-full w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPath ?? 'root'}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {blocks.map((b, i) => {
            const cat = b.node.category
            const drillable = b.node.isDir && !!b.node.children?.length
            const matchesSearch = !search || b.node.name.toLowerCase().includes(search)
            const matchesCat = !categoryFilter || cat === categoryFilter
            const dimmed = !matchesSearch || !matchesCat
            const showLabel = b.w > 56 && b.h > 26
            const showSize = b.w > 70 && b.h > 44

            return (
              <motion.div
                key={b.node.path + b.node.name}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: dimmed ? 0.18 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  delay: Math.min(i * 0.01, 0.4),
                  type: 'spring',
                  stiffness: 260,
                  damping: 24
                }}
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: b.w,
                  height: b.h,
                  backgroundColor: catColor(cat, 0.16),
                  boxShadow: `inset 0 0 0 1px ${catColor(cat, 0.42)}`
                }}
                className="group cursor-pointer overflow-hidden rounded-lg"
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.parentElement?.parentElement as HTMLElement)?.getBoundingClientRect()
                  setHover({
                    node: b.node,
                    x: e.clientX - (rect?.left ?? 0),
                    y: e.clientY - (rect?.top ?? 0)
                  })
                }}
                onMouseLeave={() => setHover((h) => (h?.node === b.node ? null : h))}
                onClick={() => (drillable ? drillInto(b.node) : void openInExplorer(b.node.path))}
                whileHover={{ backgroundColor: catColor(cat, 0.28) }}
              >
                {/* color accent bar */}
                <span
                  className="absolute left-0 top-0 h-full w-1"
                  style={{ backgroundColor: catColor(cat) }}
                />
                {showLabel && (
                  <div className="flex h-full flex-col justify-between p-2 pl-3">
                    <div className="flex items-start justify-between gap-1">
                      <span className="line-clamp-2 break-words font-mono text-xs font-semibold leading-tight text-content/90">
                        {b.node.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void openInExplorer(b.node.path)
                        }}
                        className="shrink-0 rounded p-0.5 text-muted opacity-0 transition-opacity hover:bg-bg-elevated hover:text-content group-hover:opacity-100"
                        title="Open in Explorer"
                      >
                        <FolderOpen size={12} />
                      </button>
                    </div>
                    {showSize && (
                      <div className="flex items-center gap-1.5">
                        <span className="tnum text-2xs font-bold" style={{ color: catColor(cat) }}>
                          {formatBytes(b.node.size)}
                        </span>
                        {drillable && (
                          <CornerDownRight
                            size={11}
                            className="text-faint opacity-0 group-hover:opacity-100"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              left: Math.min(hover.x + 14, width - 230),
              top: Math.min(hover.y + 14, height - 110)
            }}
            className="pointer-events-none absolute z-50 w-[220px] rounded-xl border border-border bg-bg-elevated p-3 shadow-popover"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: catColor(hover.node.category) }}
              />
              <span className="text-2xs font-semibold uppercase tracking-wide" style={{ color: catColor(hover.node.category) }}>
                {CATEGORY_LABELS[hover.node.category]}
              </span>
            </div>
            <div className="mt-1.5 break-all font-mono text-xs font-semibold leading-snug">
              {hover.node.name}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="tnum text-base font-bold">{formatBytes(hover.node.size)}</span>
              <span className="tnum text-2xs text-muted">{formatPercent(hover.node.size / total)}</span>
            </div>
            {hover.node.fileCount > 1 && (
              <div className="mt-1 text-2xs text-faint">
                {hover.node.fileCount.toLocaleString()} files
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
