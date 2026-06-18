import { ChevronRight, Home, FolderOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { pathChain } from '@/lib/tree'
import { formatBytes } from '@shared/format'

export function Breadcrumb(): JSX.Element | null {
  const result = useStore((s) => s.result)
  const currentPath = useStore((s) => s.currentPath)
  const navigateTo = useStore((s) => s.navigateTo)
  const openInExplorer = useStore((s) => s.openInExplorer)
  const currentNode = useStore((s) => s.currentNode())

  if (!result || !currentPath) return null
  const chain = pathChain(result.root, currentPath)

  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border bg-bg px-4">
      <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {chain.map((node, i) => {
          const isLast = i === chain.length - 1
          const label = i === 0 ? node.name.replace(/[\\/]$/, '') : node.name
          return (
            <div key={node.path} className="flex shrink-0 items-center">
              {i > 0 && <ChevronRight size={14} className="mx-0.5 text-faint" />}
              <motion.button
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigateTo(node.path)}
                disabled={isLast}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs transition-colors ${
                  isLast
                    ? 'font-semibold text-content'
                    : 'text-muted hover:bg-surface-2 hover:text-content'
                }`}
              >
                {i === 0 && <Home size={12} />}
                {label}
              </motion.button>
            </div>
          )
        })}
      </nav>

      {currentNode && (
        <div className="flex shrink-0 items-center gap-3 pl-3">
          <span className="tnum text-xs font-semibold text-content">
            {formatBytes(currentNode.size)}
          </span>
          <button
            onClick={() => void openInExplorer(currentNode.path)}
            className="btn h-7 gap-1.5 rounded-md border border-border bg-surface px-2.5 text-2xs text-muted hover:text-content hover:border-border-strong"
          >
            <FolderOpen size={12} /> Open
          </button>
        </div>
      )}
    </div>
  )
}
