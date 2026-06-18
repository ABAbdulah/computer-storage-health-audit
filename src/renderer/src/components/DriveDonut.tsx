import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { DriveInfo } from '@shared/types'
import { formatBytes, formatPercent } from '@shared/format'

interface DriveDonutProps {
  drive: DriveInfo
  size?: number
}

/** A compact donut showing used vs free space for one drive. */
export function DriveDonut({ drive, size = 64 }: DriveDonutProps): JSX.Element {
  const usedFrac = drive.total > 0 ? drive.used / drive.total : 0
  const data = [
    { name: 'used', value: drive.used },
    { name: 'free', value: Math.max(0, drive.free) }
  ]
  // Color the ring by pressure: calm accent → amber → rose as it fills up.
  const ringVar =
    usedFrac > 0.9 ? '--danger' : usedFrac > 0.75 ? '--warning' : '--accent'

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={size * 0.34}
            outerRadius={size * 0.5}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive
            animationDuration={700}
          >
            <Cell fill={`rgb(var(${ringVar}))`} />
            <Cell fill="rgb(var(--surface-2))" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="tnum text-xs font-bold" style={{ color: `rgb(var(${ringVar}))` }}>
          {formatPercent(usedFrac, 0)}
        </span>
      </div>
      <span className="sr-only">
        {drive.label} {formatBytes(drive.used)} used of {formatBytes(drive.total)}
      </span>
    </div>
  )
}
