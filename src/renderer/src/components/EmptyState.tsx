import { motion } from 'framer-motion'
import { ScanLine } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Logo } from './Logo'

export function EmptyState(): JSX.Element {
  const activeDrive = useStore((s) => s.activeDrive)
  const startScan = useStore((s) => s.startScan)
  const error = useStore((s) => s.error)
  const status = useStore((s) => s.status)

  return (
    <div className="grid h-full place-items-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-w-md flex-col items-center text-center"
      >
        <motion.div
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 -z-10 blur-2xl" style={{ background: 'radial-gradient(circle, rgb(var(--accent)/0.3), transparent 70%)' }} />
          <Logo size={96} />
        </motion.div>

        <h2 className="text-2xl font-extrabold tracking-tight">
          {status === 'error' ? 'That scan hit a snag' : 'See where your storage went'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {status === 'error'
            ? error || 'Something interrupted the scan. Try running it again.'
            : 'SpaceScope maps every gigabyte on your drive — system files, Docker disks, node_modules, downloads and more — so you know exactly what to clean.'}
        </p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => activeDrive && void startScan(activeDrive)}
          disabled={!activeDrive}
          className="btn mt-7 h-11 gap-2 bg-accent px-6 text-base text-white shadow-glow hover:brightness-110 disabled:opacity-40"
        >
          <ScanLine size={18} />
          Scan {activeDrive?.replace(/[\\/]$/, '') ?? 'drive'}
        </motion.button>

        <p className="mt-4 text-2xs text-faint">
          Read-only — SpaceScope never deletes anything for you.
        </p>
      </motion.div>
    </div>
  )
}
