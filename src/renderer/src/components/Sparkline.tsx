interface SparklineProps {
  data: number[]
  /** Max value the data is scaled against (e.g. 100 for percentages). */
  max?: number
  color: string
  width?: number
  height?: number
}

/** A tiny dependency-free area sparkline. */
export function Sparkline({ data, max = 100, color, width = 120, height = 30 }: SparklineProps): JSX.Element {
  const n = data.length
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, '')}`
  if (n < 2) {
    return <svg width={width} height={height} className="block" aria-hidden="true" />
  }
  const stepX = width / (n - 1)
  const pts = data.map((v, i) => {
    const x = i * stepX
    const y = height - Math.max(0, Math.min(1, v / max)) * (height - 2) - 1
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg width={width} height={height} className="block" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
