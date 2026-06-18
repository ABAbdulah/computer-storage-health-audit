import { useEffect, useRef, useState } from 'react'

export function useElementSize<T extends HTMLElement>(): [
  React.RefObject<T>,
  { width: number; height: number }
] {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, size]
}
