import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { splitBytes } from '@shared/format'

interface TickerProps {
  value: number
  /** Decimals to show. */
  decimals?: number
  className?: string
}

/** Animates a number counting up to `value`. */
export function NumberTicker({ value, decimals = 0, className }: TickerProps): JSX.Element {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v)
    })
    prev.current = value
    return () => controls.stop()
  }, [value])

  return (
    <span className={className}>
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
    </span>
  )
}

interface ByteTickerProps {
  bytes: number
  className?: string
  unitClassName?: string
}

/** Animates a byte size, counting the numeric part and showing the unit. */
export function ByteTicker({ bytes, className, unitClassName }: ByteTickerProps): JSX.Element {
  const { value, unit } = splitBytes(bytes)
  const decimals = unit === 'B' ? 0 : 2
  return (
    <span className={className}>
      <NumberTicker value={value} decimals={decimals} className="tnum" />
      <span className={unitClassName}> {unit}</span>
    </span>
  )
}
