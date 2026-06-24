import { POSITIVE } from '@/src/styles/colors'

type Props = {
  size?: number
  stage?: 0 | 1 | 2 | 3 | 4
  active?: boolean
}

// Positiveタグのアイコン：花の形はやめて、単色の円で表現する
export function DaisyIcon({ size = 24, active = false }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {active && (
        <circle cx={cx} cy={cy} r={r + size * 0.12} fill={POSITIVE.pale} opacity="0.5" />
      )}
      <circle cx={cx} cy={cy} r={r} fill={POSITIVE.base} />
    </svg>
  )
}
