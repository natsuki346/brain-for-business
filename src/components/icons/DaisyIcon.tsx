import { POSITIVE } from '@/src/styles/colors'

type Props = {
  size?: number
  stage?: 0 | 1 | 2 | 3 | 4 // 0:タネ 1:芽 2:蕾 3:小花 4:満開
  active?: boolean
}

export function DaisyIcon({ size = 24, stage = 4, active = false }: Props) {
  const cx = size / 2
  const cy = size / 2

  if (stage === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <ellipse cx={cx} cy={cy + 2} rx={size * 0.22} ry={size * 0.28}
          fill={POSITIVE.textDeep} transform={`rotate(-10,${cx},${cy + 2})`} />
        <ellipse cx={cx - size * 0.06} cy={cy - size * 0.04} rx={size * 0.08} ry={size * 0.05}
          fill="rgba(255,255,255,0.15)" />
      </svg>
    )
  }

  if (stage === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <ellipse cx={cx} cy={cy + 4} rx={size * 0.18} ry={size * 0.22} fill={POSITIVE.deep} opacity="0.7" />
        <line x1={cx} y1={cy + 2} x2={cx} y2={cy - size * 0.3}
          stroke={POSITIVE.base} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx={cx - size * 0.12} cy={cy - size * 0.15} rx={size * 0.1} ry={size * 0.06}
          fill={POSITIVE.soft} transform={`rotate(-30,${cx - size * 0.12},${cy - size * 0.15})`} />
        <ellipse cx={cx + size * 0.12} cy={cy - size * 0.2} rx={size * 0.1} ry={size * 0.06}
          fill={POSITIVE.soft} transform={`rotate(30,${cx + size * 0.12},${cy - size * 0.2})`} />
      </svg>
    )
  }

  const petalCount = stage >= 4 ? 14 : stage >= 3 ? 12 : 10
  const petalR = size * (stage >= 4 ? 0.36 : stage >= 3 ? 0.28 : 0.22)
  const petalRx = size * (stage >= 4 ? 0.1 : 0.08)
  const petalRy = size * (stage >= 4 ? 0.22 : 0.16)
  const petalFill = POSITIVE.base
  const centerR = size * (stage >= 4 ? 0.14 : 0.1)
  const angles = Array.from({ length: petalCount }, (_, i) => i * (360 / petalCount))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${cx},${cy})`}>
        {active && (
          <circle cx={0} cy={0} r={petalR + petalRy} fill={POSITIVE.pale} opacity="0.35" />
        )}
        {angles.map((angle, i) => (
          <ellipse key={i} cx={0} cy={-petalR} rx={petalRx} ry={petalRy}
            fill={petalFill} stroke={POSITIVE.deep} strokeWidth="0.5"
            transform={`rotate(${angle})`} />
        ))}
        <circle cx={0} cy={0} r={centerR} fill={POSITIVE.deep} stroke={POSITIVE.textDeep} strokeWidth="0.5" />
        <circle cx={0} cy={0} r={centerR * 0.55} fill={POSITIVE.textDeep} />
      </g>
    </svg>
  )
}
