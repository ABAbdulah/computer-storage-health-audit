import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ScanLine,
  Loader2,
  XCircle,
  ChevronDown,
  HardDrive,
  Map as MapIcon,
  List as ListIcon,
  PanelRight,
  RotateCw
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { SegmentedControl } from './SegmentedControl'
import { formatBytes } from '@shared/format'

function DriveSelector(): JSX.Element {
  const drives = useStore((s) => s.drives)
  const activeDrive = useStore((s) => s.activeDrive)
  const setActiveDrive = useStore((s) => s.setActiveDrive)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = drives.find((d) => d.path === activeDrive)

  useEffect(() => {
    function onClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn h-9 gap-2 rounded-lg border border-border bg-surface px-3 text-content hover:border-border-strong"
      >
        <HardDrive size={15} className="text-accent" />
        <span className="font-mono font-semibold">{current?.label ?? 'Drive'}</span>
        {current && (
          <span className="tnum text-2xs text-muted">{formatBytes(current.total)}</span>
        )}
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-border bg-bg-elevated p-1 shadow-popover"
          >
            {drives.map((d) => (
              <button
                key={d.path}
                onClick={() => {
                  setActiveDrive(d.path)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                  d.path === activeDrive ? 'bg-surface-2' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <HardDrive size={14} className="text-muted" />
                  <span className="font-mono font-semibold">{d.label}</span>
                  {d.volumeName && <span className="text-2xs text-faint">{d.volumeName}</span>}
                </span>
                <span className="tnum text-2xs text-muted">{formatBytes(d.free)} free</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TopBar(): JSX.Element {
  const status = useStore((s) => s.status)
  const activeDrive = useStore((s) => s.activeDrive)
  const startScan = useStore((s) => s.startScan)
  const cancelScan = useStore((s) => s.cancelScan)
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const viewMode = useStore((s) => s.viewMode)
  const setViewMode = useStore((s) => s.setViewMode)
  const toggleRightPanel = useStore((s) => s.toggleRightPanel)
  const rightPanelOpen = useStore((s) => s.rightPanelOpen)
  const hasResult = useStore((s) => s.result !== null)

  const scanning = status === 'scanning'

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-bg-elevated/80 px-4 backdrop-blur">
      <DriveSelector />

      {scanning ? (
        <button
          onClick={() => void cancelScan()}
          className="btn h-9 gap-2 bg-danger/10 px-3.5 text-danger hover:bg-danger/20"
        >
          <XCircle size={15} /> Cancel
        </button>
      ) : (
        <button
          onClick={() => activeDrive && void startScan(activeDrive)}
          disabled={!activeDrive}
          className="btn h-9 gap-2 bg-accent px-4 text-white shadow-glow hover:brightness-110 disabled:opacity-40"
        >
          {hasResult ? <RotateCw size={15} /> : <ScanLine size={15} />}
          {hasResult ? 'Rescan' : 'Scan'}
        </button>
      )}

      <div className="relative ml-1 max-w-xs flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name…"
          spellCheck={false}
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 font-mono text-xs text-content placeholder:text-faint focus:border-accent/50 focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {scanning && (
          <span className="flex items-center gap-1.5 text-2xs font-medium text-muted">
            <Loader2 size={13} className="animate-spin text-accent" /> Working…
          </span>
        )}
        <SegmentedControl
          layoutId="view-toggle"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'treemap', label: 'Map', icon: <MapIcon size={14} /> },
            { value: 'list', label: 'List', icon: <ListIcon size={14} /> }
          ]}
        />
        <button
          onClick={toggleRightPanel}
          className={`btn h-9 w-9 rounded-lg border border-border bg-surface hover:border-border-strong ${
            rightPanelOpen ? 'text-accent' : 'text-muted'
          }`}
          title="Toggle Quick Wins panel"
          aria-label="Toggle Quick Wins panel"
        >
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  )
}
