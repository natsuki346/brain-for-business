'use client'

import { POSITIVE } from '@/src/styles/colors'

export interface DaisyBubbleProps {
  size: number
}

// 茎 + 左右の葉（sprout/bud/bloom 共通）
function StemAndLeaves() {
  return (
    <>
      {/* 茎 */}
      <rect x="47" y="56" width="6" height="28" rx="3" fill={POSITIVE.deep} />
      {/* 左葉 */}
      <ellipse
        cx="36" cy="68" rx="16" ry="7" fill={POSITIVE.base}
        transform="rotate(-30 36 68)"
      />
      {/* 右葉 */}
      <ellipse
        cx="64" cy="68" rx="16" ry="7" fill={POSITIVE.base}
        transform="rotate(30 64 68)"
      />
    </>
  )
}

const PETAL_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324]

function BloomSVG() {
  return (
    <>
      <circle cx="50" cy="50" r="50" fill={POSITIVE.pale} />
      <StemAndLeaves />
      {/* 花びら 10枚 */}
      {PETAL_ANGLES.map(angle => (
        <ellipse
          key={angle}
          cx="50" cy="33" rx="5" ry="14"
          fill={POSITIVE.base}
          transform={`rotate(${angle} 50 48)`}
        />
      ))}
      {/* 花芯 */}
      <circle cx="50" cy="48" r="11" fill={POSITIVE.deep} />
      <circle cx="50" cy="48" r="7"  fill={POSITIVE.textDeep} />
    </>
  )
}

// Daisy は常に満開（成長ステージなし）
export default function DaisyBubble({ size }: DaisyBubbleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <BloomSVG />
    </svg>
  )
}
