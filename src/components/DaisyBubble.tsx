'use client'

import { POSITIVE } from '@/src/styles/colors'

export interface DaisyBubbleProps {
  size: number
}

// Positiveタグのバブル：花の形はやめて、単色の円で表現する
export default function DaisyBubble({ size }: DaisyBubbleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="50" cy="50" r="50" fill={POSITIVE.base} />
    </svg>
  )
}
