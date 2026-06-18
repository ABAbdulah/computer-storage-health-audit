import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useStore } from '@/store/useStore'

export function ThemeToggle(): JSX.Element {
  const theme = useStore((s) => s.theme)
  const toggle = useStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      className="btn group relative h-9 w-9 overflow-hidden rounded-lg border border-border bg-surface text-muted hover:text-content hover:border-border-strong"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, scale: 0, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="absolute inset-0 grid place-items-center"
        >
          {isDark ? <Moon size={17} /> : <Sun size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
