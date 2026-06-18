import { motion } from 'framer-motion'

interface Segment<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: Segment<T>[]
  onChange: (v: T) => void
  layoutId: string
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  layoutId
}: SegmentedControlProps<T>): JSX.Element {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'text-content' : 'text-muted hover:text-content'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-bg-elevated shadow-card"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
